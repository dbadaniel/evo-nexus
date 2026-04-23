/**
 * Chat Bridge — spawns Claude via Agent SDK with structured streaming events.
 * Supports conversation resume via SDK session IDs.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
let sdkModule = null;

// Workspace root is three levels up from this file (dashboard/terminal-server/src/).
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..');
const ALLOWED_CLI = new Set(['claude', 'openclaude']);
const ALLOWED_VARS = new Set([
  'CLAUDE_CODE_USE_OPENAI', 'CLAUDE_CODE_USE_GEMINI',
  'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX',
  'OPENAI_BASE_URL', 'OPENAI_API_KEY', 'OPENAI_MODEL',
  'CODEX_AUTH_JSON_PATH', 'CODEX_API_KEY',
  'GEMINI_API_KEY', 'GEMINI_MODEL',
  'AWS_REGION', 'AWS_BEARER_TOKEN_BEDROCK',
  'ANTHROPIC_VERTEX_PROJECT_ID', 'CLOUD_ML_REGION',
]);

/**
 * Read chat.trustMode from config/workspace.yaml.
 * Uses a targeted regex — no YAML dep needed.
 * Returns false if the key is absent or parsing fails.
 */
function readTrustMode() {
  try {
    const yaml = fs.readFileSync(path.join(WORKSPACE_ROOT, 'config', 'workspace.yaml'), 'utf8');
    // Match `chat:` section followed by a line containing `trustMode: true`
    const m = yaml.match(/^chat:\s*\n(?:[ \t]+[^\n]*\n)*?[ \t]+trustMode:\s*(true|false)/m);
    return m ? m[1] === 'true' : false;
  } catch {
    return false;
  }
}

function loadProviderConfig() {
  try {
    const configPath = path.join(WORKSPACE_ROOT, 'config', 'providers.json');
    if (!fs.existsSync(configPath)) {
      return { active: 'anthropic', cli_command: 'claude', env_vars: {} };
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const active = config.active_provider || 'anthropic';
    const provider = config.providers?.[active] || {};

    let cliCommand = provider.cli_command || 'claude';
    if (!ALLOWED_CLI.has(cliCommand)) {
      cliCommand = 'claude';
    }

    const envVars = Object.fromEntries(
      Object.entries(provider.env_vars || {}).filter(
        ([k, v]) => v !== '' && ALLOWED_VARS.has(k)
      )
    );

    if (!envVars.OPENAI_MODEL) {
      if (active === 'codex_auth') {
        envVars.OPENAI_MODEL = 'codexplan';
      } else if (active === 'openai') {
        envVars.OPENAI_MODEL = 'gpt-4.1';
      }
    }

    if (active === 'codex_auth' && 'OPENAI_API_KEY' in envVars) {
      delete envVars.OPENAI_API_KEY;
    }

    return { active, cli_command: cliCommand, env_vars: envVars };
  } catch (err) {
    console.warn(`[chat-bridge] Could not read providers.json: ${err.message}`);
    return { active: 'anthropic', cli_command: 'claude', env_vars: {} };
  }
}

// Tools that run silently without user confirmation.
const AUTO_APPROVE = new Set([
  'Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'ToolSearch',
  'NotebookRead', 'Skill',
]);

// Tools that require explicit user approval before execution.
// Any tool NOT in either set also requires approval (conservative default).
const NEEDS_APPROVAL = new Set([
  'Write', 'Edit', 'Bash', 'NotebookEdit', 'Agent',
]);

/**
 * Parse a .claude/agents/{name}.md file into an AgentDefinition.
 * Extracts YAML frontmatter for metadata and the body as the prompt.
 */
function loadAgentFile(agentName, cwd) {
  const agentPath = path.join(cwd, '.claude', 'agents', `${agentName}.md`);
  if (!fs.existsSync(agentPath)) {
    console.warn(`[chat-bridge] Agent file not found: ${agentPath}`);
    return null;
  }

  const raw = fs.readFileSync(agentPath, 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    return { description: agentName, prompt: raw.trim() };
  }

  // Simple YAML frontmatter parser (no dependency needed)
  const fmText = fmMatch[1];
  const meta = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      meta[m[1]] = val;
    }
    // Parse tools list
    if (line.match(/^\s+-\s+\w+/)) {
      if (!meta._lastKey) continue;
      if (!Array.isArray(meta[meta._lastKey])) meta[meta._lastKey] = [];
      meta[meta._lastKey].push(line.trim().replace(/^-\s*/, ''));
    }
    if (line.match(/^\w+:$/)) {
      meta._lastKey = line.replace(':', '').trim();
      meta[meta._lastKey] = [];
    }
  }
  delete meta._lastKey;

  const prompt = fmMatch[2].trim();
  const def = {
    description: typeof meta.description === 'string' ? meta.description : agentName,
    prompt,
  };
  if (meta.model) def.model = meta.model;
  if (Array.isArray(meta.tools)) def.tools = meta.tools;

  return def;
}

async function loadSDK() {
  if (!sdkModule) {
    sdkModule = await import('@anthropic-ai/claude-agent-sdk');
  }
  return sdkModule;
}

/**
 * Scan a tool_result text for a ticket-creation response.
 * Returns the ticket id if a POST /api/tickets response is detected, else null.
 * Heuristic: a JSON object with a UUID `id`, `status` in ticket statuses, and a `priority` field.
 */
const TICKET_STATUSES = new Set(['open', 'in_progress', 'blocked', 'review', 'resolved', 'closed']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function _looksLikeTicket(obj) {
  return (
    obj &&
    typeof obj.id === 'string' &&
    UUID_RE.test(obj.id) &&
    typeof obj.status === 'string' &&
    TICKET_STATUSES.has(obj.status) &&
    typeof obj.priority === 'string' &&
    Object.prototype.hasOwnProperty.call(obj, 'title')
  );
}

// Scan `text` for balanced {...} JSON objects and try to parse each.
function _extractJsonObjects(text) {
  const results = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          results.push(text.slice(i, j + 1));
          i = j;
          break;
        }
      }
    }
  }
  return results;
}

// Regex fallback — works for both JSON ("id":"...") and Python repr ('id': '...')
// and extracts a plausible ticket id when the structure has the expected fields.
function _regexScanForTicket(text) {
  const hasIdPriorityStatus =
    /["']id["']\s*:\s*["']([0-9a-f-]{36})["']/i.test(text) &&
    /["']priority["']\s*:\s*["'](urgent|high|medium|low)["']/i.test(text) &&
    /["']status["']\s*:\s*["'](open|in_progress|blocked|review|resolved|closed)["']/i.test(text) &&
    /["']title["']\s*:/i.test(text);
  if (!hasIdPriorityStatus) return null;
  const m = text.match(/["']id["']\s*:\s*["']([0-9a-f-]{36})["']/i);
  return m && UUID_RE.test(m[1]) ? m[1] : null;
}

function detectCreatedTicketId(text) {
  if (!text || typeof text !== 'string') return null;
  const hasIdKey = text.includes('"id"') || text.includes("'id'");
  const hasPriorityKey = text.includes('"priority"') || text.includes("'priority'");
  if (!hasIdKey || !hasPriorityKey) return null;
  // First: strict JSON parse attempts.
  for (const candidate of _extractJsonObjects(text)) {
    try {
      const obj = JSON.parse(candidate);
      if (_looksLikeTicket(obj)) return obj.id;
    } catch {}
  }
  try {
    const obj = JSON.parse(text.trim());
    if (_looksLikeTicket(obj)) return obj.id;
  } catch {}
  // Fallback: regex scan — handles Python repr output (single quotes).
  return _regexScanForTicket(text);
}

function extractCliResult(rawStdout) {
  const text = (rawStdout || '').trim();
  if (!text) return { resultText: '', usage: undefined, totalCost: undefined, modelUsage: undefined, sessionId: undefined, parsed: false };

  try {
    const parsed = JSON.parse(text);
    return {
      resultText: parsed.result || text,
      usage: parsed.usage,
      totalCost: parsed.total_cost_usd,
      modelUsage: parsed.modelUsage,
      sessionId: parsed.session_id,
      parsed: true,
    };
  } catch {}

  const lastBrace = text.lastIndexOf('{');
  if (lastBrace !== -1) {
    const candidate = text.slice(lastBrace);
    try {
      const parsed = JSON.parse(candidate);
      return {
        resultText: parsed.result || text,
        usage: parsed.usage,
        totalCost: parsed.total_cost_usd,
        modelUsage: parsed.modelUsage,
        sessionId: parsed.session_id,
        parsed: true,
      };
    } catch {}
  }

  return { resultText: text, usage: undefined, totalCost: undefined, modelUsage: undefined, sessionId: undefined, parsed: false };
}

function splitJsonLines(buffer) {
  const lines = buffer.split(/\r?\n/);
  const rest = lines.pop() || '';
  return { lines: lines.filter(Boolean), rest };
}

function buildCliUserMessage(prompt, files) {
  const content = [];

  if (prompt) {
    content.push({
      type: 'text',
      text: prompt,
    });
  }

  if (Array.isArray(files)) {
    for (const file of files) {
      if (!file?.base64 || typeof file.type !== 'string' || !file.type.startsWith('image/')) continue;
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.type,
          data: file.base64,
        },
      });
    }
  }

  return {
    type: 'user',
    session_id: '',
    message: {
      role: 'user',
      content: content.length === 1 && content[0].type === 'text' ? content[0].text : content,
    },
    parent_tool_use_id: null,
  };
}

function buildCliPermissionResponse(requestId, approved, input) {
  return {
    type: 'control_response',
    response: approved
      ? {
          subtype: 'success',
          request_id: requestId,
          response: {
            behavior: 'allow',
            updatedInput: (input && typeof input === 'object') ? input : {},
          },
        }
      : {
          subtype: 'success',
          request_id: requestId,
          response: {
            behavior: 'deny',
            message: 'User denied this tool use.',
          },
        },
  };
}

function buildCliElicitationResponse(requestId, action, content) {
  const response = { action };
  if (content && typeof content === 'object') {
    response.content = content;
  }
  return {
    type: 'control_response',
    response: {
      subtype: 'success',
      request_id: requestId,
      response,
    },
  };
}

function buildAttachedFilesPrompt(files) {
  if (!Array.isArray(files) || files.length === 0) return '';

  const imageLines = [];
  const fileLines = [];
  for (const f of files) {
    if (!f?.path || !f?.name) continue;
    const type = typeof f.type === 'string' ? f.type : 'application/octet-stream';
    const line = `- ${f.name}: ${f.path}`;
    if (type.startsWith('image/')) {
      imageLines.push(line);
    } else {
      fileLines.push(line);
    }
  }

  const parts = [];
  if (imageLines.length > 0) {
    parts.push(
      '[Attached images]',
      'The images below are attached to this message for direct visual inspection and were also saved as local temp files for this chat session.',
      'Use the image attachment itself for visual understanding.',
      'Use the saved local path only when you need filesystem operations on the file.',
      ...imageLines,
    );
  }
  if (fileLines.length > 0) {
    parts.push(
      '[Attached files - inspect by path if needed]',
      ...fileLines,
    );
  }

  return parts.join('\n');
}

function buildRuntimeContextBlock(agentName, sessionId) {
  const runtimeLines = [
    '## Runtime context',
    'You are running inside the EvoNexus dashboard.',
  ];
  if (agentName) {
    runtimeLines.push(`- Current agent slug: ${agentName}`);
  }
  runtimeLines.push(`- Current chat session id: ${sessionId}`);
  runtimeLines.push('');
  runtimeLines.push(`When you create a ticket via \`evo.post("/api/tickets", {...})\`, include \`source_agent: "${agentName}"\` and \`source_session_id: "${sessionId}"\` in the payload so the ticket records who created it.`);
  runtimeLines.push('');
  runtimeLines.push('## Tool permission policy');
  runtimeLines.push('Read/Glob/Grep/WebFetch/ToolSearch/Skill run automatically.');
  runtimeLines.push('Write/Edit/Bash/Agent/NotebookEdit need user approval per call when the provider supports approval callbacks in this environment.');
  runtimeLines.push('Do not ask for permission in plain text for safe read/search tools.');
  return runtimeLines.join('\n');
}

class ChatBridge {
  constructor() {
    this.sessions = new Map(); // sessionId -> { query, abortController, active, sdkSessionId }
  }

  async startSession(sessionId, options = {}) {
    const providerConfig = loadProviderConfig();
    if (providerConfig.active && providerConfig.active !== 'anthropic') {
      return this._startCliSession(sessionId, {
        ...options,
        providerConfig,
      });
    }

    return this._startSdkSession(sessionId, options);
  }

  async _startSdkSession(sessionId, options = {}) {
    const { query: sdkQuery } = await loadSDK();

    const {
      agentName,
      workingDir,
      prompt,
      files,
      sdkSessionId,
      onMessage,
      onError,
      onComplete,
    } = options;

    if (this.sessions.has(sessionId)) {
      await this.stopSession(sessionId);
    }

    const abortController = new AbortController();

    const queryOptions = {
      cwd: workingDir || process.cwd(),
      includePartialMessages: true,
      abortController,
    };

    // Load agent definition from .claude/agents/{name}.md
    if (agentName) {
      const agentDef = loadAgentFile(agentName, queryOptions.cwd);
      if (agentDef) {
        // Build runtime context block for ticket source attribution
        const runtimeLines = [
          '## Runtime context',
          'You are running inside the EvoNexus dashboard.',
        ];
        if (agentName) {
          runtimeLines.push(`- Current agent slug: ${agentName}`);
        }
        runtimeLines.push(`- Current chat session id: ${sessionId}`);
        runtimeLines.push('');
        runtimeLines.push('When you create a ticket via `evo.post("/api/tickets", {...})`, include `source_agent: "' + agentName + '"` and `source_session_id: "' + sessionId + '"` in the payload so the ticket records who created it.');
        runtimeLines.push('');
        runtimeLines.push('## Tool permission policy');
        runtimeLines.push('Read/Glob/Grep/WebFetch/ToolSearch/Skill run automatically.');
        runtimeLines.push('Write/Edit/Bash/Agent/NotebookEdit need user approval per call — the UI shows a card with Allow/Deny buttons. Don\'t ask for permission in text; just call the tool and the user will respond in the UI.');

        const runtimeBlock = buildRuntimeContextBlock(agentName, sessionId);

        // Use systemPrompt with claude_code preset + agent prompt appended
        queryOptions.systemPrompt = {
          type: 'preset',
          preset: 'claude_code',
          append: agentDef.prompt + '\n\n' + runtimeBlock,
        };
        if (agentDef.model) queryOptions.model = agentDef.model;
        console.log(`[chat-bridge] Loaded agent "${agentName}" via systemPrompt.append (${agentDef.prompt.length} chars, model: ${agentDef.model || 'inherit'})`);
      } else {
        console.warn(`[chat-bridge] Agent "${agentName}" not found, running without agent`);
      }
    }

    queryOptions.allowedTools = [
      'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
      'Agent', 'Skill', 'WebSearch', 'WebFetch',
      'NotebookEdit', 'ToolSearch',
    ];

    // trustMode is read fresh on EVERY tool decision below, so toggling it in
    // the UI takes effect mid-session without needing a restart.
    if (readTrustMode()) {
      console.log(`[chat-bridge] Trust mode ON at session start (${sessionId})`);
    }

    // Per-tool approval flow — works for main thread AND spawned subagents.
    //
    // The SDK provides two hooks: `canUseTool` (main thread only) and the
    // PreToolUse hook event (fires for both main thread AND subagents, with
    // `agent_id` set when inside a subagent). We register both so the flow
    // is uniform regardless of who invoked the tool.
    const requestApprovalFromUser = (toolName, input, requestId, agentId) => {
      const currentSession = this.sessions.get(sessionId);
      if (!currentSession || !currentSession.active) {
        return Promise.resolve({ behavior: 'deny', message: 'Session is no longer active.' });
      }
      return new Promise((resolve) => {
        if (!currentSession.pendingApprovals) currentSession.pendingApprovals = new Map();
        currentSession.pendingApprovals.set(requestId, resolve);
        if (onMessage) {
          onMessage({
            type: 'permission_request',
            requestId,
            toolName,
            input,
            agentId: agentId || null,
          });
        }
      });
    };

    const requestElicitationFromUser = (request) => {
      const currentSession = this.sessions.get(sessionId);
      if (!currentSession || !currentSession.active) {
        return Promise.resolve({ action: 'cancel' });
      }
      const requestId = request.elicitationId || `elicit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return new Promise((resolve) => {
        if (!currentSession.pendingElicitations) currentSession.pendingElicitations = new Map();
        currentSession.pendingElicitations.set(requestId, resolve);
        if (onMessage) {
          onMessage({
            type: 'elicitation_request',
            requestId,
            mcpServerName: request.serverName,
            message: request.message,
            mode: request.mode || 'form',
            url: request.url || null,
            elicitationId: request.elicitationId || null,
            requestedSchema: request.requestedSchema || null,
            title: request.title || null,
            displayName: request.displayName || null,
            description: request.description || null,
          });
        }
      });
    };

    queryOptions.canUseTool = async (toolName, input, sdkOptions) => {
      if (readTrustMode() || AUTO_APPROVE.has(toolName)) {
        return { behavior: 'allow' };
      }
      const requestId = sdkOptions.toolUseID || `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return requestApprovalFromUser(toolName, input, requestId, null);
    };

    queryOptions.hooks = {
      ...(queryOptions.hooks || {}),
      PreToolUse: [{
        hooks: [async (hookInput, toolUseID) => {
          const toolName = hookInput.tool_name;
          const toolInput = hookInput.tool_input;
          const agentId = hookInput.agent_id || null;
          if (readTrustMode() || AUTO_APPROVE.has(toolName)) {
            return {
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
              },
            };
          }
          const requestId = toolUseID || `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          // If main-thread canUseTool already handled this requestId, skip to avoid double-prompt.
          const currentSession = this.sessions.get(sessionId);
          if (currentSession?.pendingApprovals?.has(requestId)) {
            // Another handler already opened the prompt — wait on the same resolver.
            return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'defer' } };
          }
          const decision = await requestApprovalFromUser(toolName, toolInput, requestId, agentId);
          return {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: decision.behavior === 'allow' ? 'allow' : 'deny',
              permissionDecisionReason: decision.message || undefined,
            },
          };
        }],
      }],
    };

    queryOptions.onElicitation = async (request) => requestElicitationFromUser(request);

    // Enable subagent progress summaries
    queryOptions.agentProgressSummaries = true;

    // Resume existing conversation if we have an SDK session ID
    if (sdkSessionId) {
      queryOptions.resume = sdkSessionId;
    }

    // Save attached files to temp dir and reference in prompt
    let finalPrompt = prompt || '';
    if (files && files.length > 0) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evo-chat-'));
      const savedPaths = [];
      for (const f of files) {
        if (f.base64) {
          const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = path.join(tmpDir, safeName);
          fs.writeFileSync(filePath, Buffer.from(f.base64, 'base64'));
          savedPaths.push({ name: f.name, path: filePath, type: f.type });
        }
      }
      if (savedPaths.length > 0) {
        const fileList = savedPaths
          .map(f => `- ${f.name}: ${f.path}`)
          .join('\n');
        const fileNote = `\n\n[Attached files — use Read tool to view them]\n${fileList}`;
        finalPrompt = finalPrompt + fileNote;
      }
    }

    const session = {
      active: true,
      abortController,
      agentName,
      sdkSessionId: sdkSessionId || null,
      pendingApprovals: new Map(),
      pendingElicitations: new Map(),
    };
    this.sessions.set(sessionId, session);

    // Run query in background
    (async () => {
      try {
        console.log(`[chat-bridge] Starting query for session ${sessionId}, agent: ${agentName}, resume: ${sdkSessionId || 'new'}`);
        console.log(`[chat-bridge] Query options:`, JSON.stringify({ cwd: queryOptions.cwd, agent: queryOptions.agent, resume: queryOptions.resume, allowedTools: queryOptions.allowedTools?.length }, null, 2));
        const q = sdkQuery({ prompt: finalPrompt, options: queryOptions });
        console.log(`[chat-bridge] Query created, starting iteration...`);

        for await (const message of q) {
          if (!session.active) break;

          const eventDetail = message.type === 'stream_event' ? ` event=${message.event?.type} cb=${message.event?.content_block?.type || message.event?.delta?.type || ''}` : '';
          if (message.type === 'system') {
            console.log(`[chat-bridge] System message: subtype=${message.subtype}, agent=${message.agent || 'none'}, data=${JSON.stringify(message).slice(0, 200)}`);
          } else {
            console.log(`[chat-bridge] Message received: type=${message.type}${eventDetail}`);
          }

          // Capture SDK session ID from any message that has it
          if (message.session_id && !session.sdkSessionId) {
            session.sdkSessionId = message.session_id;
            if (onMessage) {
              onMessage({ type: 'session_id', sdkSessionId: message.session_id });
            }
          }

          // Auto-detect ticket creation in tool_result blocks.
          if (message.type === 'user') {
            const content = message.message?.content || message.content;
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type !== 'tool_result') continue;
                const raw = Array.isArray(block.content)
                  ? block.content.map(c => (typeof c === 'string' ? c : c?.text || '')).join('\n')
                  : (typeof block.content === 'string' ? block.content : '');
                const ticketId = detectCreatedTicketId(raw);
                if (ticketId) {
                  console.log(`[chat-bridge] ✓ Detected ticket creation: ${ticketId} — auto-binding to session ${sessionId}`);
                  if (onMessage) {
                    onMessage({ type: 'ticket_detected', ticketId });
                  }
                }
              }
            }
          }

          if (onMessage) {
            onMessage(this._transformMessage(message));
          }
        }
        console.log(`[chat-bridge] Query iteration finished for session ${sessionId}`);

        session.active = false;
        this.sessions.delete(sessionId);
        if (onComplete) onComplete({ sdkSessionId: session.sdkSessionId });
      } catch (err) {
        console.error(`[chat-bridge] Error in session ${sessionId}:`, err.message || err);
        session.active = false;
        this.sessions.delete(sessionId);
        if (err.name === 'AbortError') {
          if (onComplete) onComplete({ sdkSessionId: session.sdkSessionId });
        } else {
          if (onError) onError(err);
        }
      }
    })();

    return { sessionId, sdkSessionId: session.sdkSessionId };
  }

  async _startCliSession(sessionId, options = {}) {
    const {
      agentName,
      workingDir,
      prompt,
      files,
      sdkSessionId,
      providerConfig,
      onMessage,
      onError,
      onComplete,
    } = options;

    if (this.sessions.has(sessionId)) {
      await this.stopSession(sessionId);
    }

    const cwd = workingDir || process.cwd();
    const cliCommand = providerConfig?.cli_command || 'openclaude';
    const providerEnv = { ...(providerConfig?.env_vars || {}) };
    console.log(`[chat-bridge] Using CLI backend for session ${sessionId}: provider=${providerConfig?.active || 'unknown'} cli=${cliCommand} agent=${agentName || 'none'} resume=${sdkSessionId || 'new'}`);

    const promptParts = [];
    const runtimeBlock = buildRuntimeContextBlock(agentName, sessionId);
    if (prompt) {
      promptParts.push(prompt);
    }

    let savedPaths = [];
    if (files && files.length > 0) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evo-chat-'));
      for (const f of files) {
        if (!f.base64) continue;
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(tmpDir, safeName);
        fs.writeFileSync(filePath, Buffer.from(f.base64, 'base64'));
        savedPaths.push({ name: f.name, path: filePath, type: f.type });
      }
    }
    if (savedPaths.length > 0) {
      const attachmentPrompt = buildAttachedFilesPrompt(savedPaths);
      if (attachmentPrompt) {
        promptParts.push(attachmentPrompt);
      }
    }

    const finalPrompt = promptParts.filter(Boolean).join('\n\n');
    const args = [
      '-p',
      '--input-format', 'stream-json',
      '--output-format', 'stream-json',
      '--include-partial-messages',
      '--verbose',
      '--permission-mode', 'default',
      '--permission-prompt-tool', 'stdio',
      '--allowedTools', 'Read,Glob,Grep,WebFetch,ToolSearch,Skill',
      '--append-system-prompt', runtimeBlock,
    ];
    if (sdkSessionId) {
      args.push('--resume', sdkSessionId);
    }
    if (agentName) {
      args.push('--agent', agentName);
    }
    const SYSTEM_VARS = [
      'HOME', 'USER', 'SHELL', 'PATH', 'LANG', 'LC_ALL', 'LC_CTYPE',
      'LOGNAME', 'HOSTNAME', 'XDG_RUNTIME_DIR', 'XDG_DATA_HOME',
      'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'TMPDIR',
      'SSH_AUTH_SOCK', 'SSH_AGENT_PID',
      'NVM_DIR', 'NVM_BIN', 'NVM_INC',
      'CODEX_HOME', 'CLAUDE_CONFIG_DIR',
    ];
    const cleanEnv = {};
    for (const key of SYSTEM_VARS) {
      if (process.env[key]) cleanEnv[key] = process.env[key];
    }

    const child = spawn(cliCommand, args, {
      cwd,
      env: {
        ...cleanEnv,
        ...providerEnv,
        TERM: 'dumb',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const session = {
      active: true,
      backend: 'cli',
      process: child,
      sdkSessionId: null,
      stdout: '',
      stderr: '',
      stdoutBuffer: '',
      sawResult: false,
      sawError: false,
      pendingApprovals: new Map(),
      pendingElicitations: new Map(),
    };
    this.sessions.set(sessionId, session);
    console.log(`[chat-bridge] Spawned CLI process for session ${sessionId}: ${cliCommand} ${args.join(' ')} [prompt via stdin]`);

    try {
      child.stdin.write(`${JSON.stringify(buildCliUserMessage(finalPrompt, files))}\n`);
    } catch (err) {
      console.error(`[chat-bridge] Failed to write prompt to CLI stdin for session ${sessionId}:`, err.message || err);
    }

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      session.stdout += text;
      session.stdoutBuffer += text;
      const { lines, rest } = splitJsonLines(session.stdoutBuffer);
      session.stdoutBuffer = rest;

      for (const line of lines) {
        let message;
        try {
          message = JSON.parse(line);
        } catch (err) {
          console.warn(`[chat-bridge] Failed to parse CLI stream line for session ${sessionId}: ${err.message}; line=${JSON.stringify(line.slice(0, 240))}`);
          continue;
        }

        if (message.session_id && !session.sdkSessionId) {
          session.sdkSessionId = message.session_id;
          if (onMessage) {
            onMessage({ type: 'session_id', sdkSessionId: message.session_id });
          }
        }

        if (message.type === 'control_request') {
          if (message.request?.subtype === 'can_use_tool') {
            const requestId = message.request_id;
            const toolName = message.request.tool_name || 'Tool';
            const input = message.request.input || {};
            if (readTrustMode() || AUTO_APPROVE.has(toolName)) {
              try {
                child.stdin.write(`${JSON.stringify(buildCliPermissionResponse(requestId, true, input))}\n`);
              } catch (err) {
                console.error(`[chat-bridge] Failed to auto-approve CLI tool request for session ${sessionId}:`, err.message || err);
              }
              continue;
            }
            session.pendingApprovals.set(requestId, {
              toolName,
              input,
              toolUseId: message.request.tool_use_id || null,
              agentId: message.request.agent_id || null,
            });
            if (onMessage) {
              onMessage({
                type: 'permission_request',
                requestId,
                toolName,
                input,
                agentId: message.request.agent_id || null,
                title: message.request.action_description || null,
                description: message.request.decision_reason || null,
              });
            }
          } else if (message.request?.subtype === 'elicitation') {
            const requestId = message.request_id;
            session.pendingElicitations.set(requestId, {
              mcpServerName: message.request.mcp_server_name || null,
              message: message.request.message || '',
              mode: message.request.mode || 'form',
              url: message.request.url || null,
              elicitationId: message.request.elicitation_id || null,
              requestedSchema: message.request.requested_schema || null,
              title: message.request.title || null,
              displayName: message.request.display_name || null,
              description: message.request.description || null,
            });
            if (onMessage) {
              onMessage({
                type: 'elicitation_request',
                requestId,
                mcpServerName: message.request.mcp_server_name || null,
                message: message.request.message || '',
                mode: message.request.mode || 'form',
                url: message.request.url || null,
                elicitationId: message.request.elicitation_id || null,
                requestedSchema: message.request.requested_schema || null,
                title: message.request.title || null,
                displayName: message.request.display_name || null,
                description: message.request.description || null,
              });
            }
          } else {
            console.log(`[chat-bridge] CLI control request for session ${sessionId}: subtype=${message.request?.subtype || 'unknown'}`);
          }
          continue;
        }

        if (message.type === 'control_cancel_request') {
          if (message.request_id) {
            session.pendingApprovals.delete(message.request_id);
            session.pendingElicitations.delete(message.request_id);
          }
          continue;
        }

        if (message.type === 'control_response') {
          const resolvedRequestId = message.response?.request_id;
          if (resolvedRequestId) {
            session.pendingApprovals.delete(resolvedRequestId);
            session.pendingElicitations.delete(resolvedRequestId);
          }
          continue;
        }

        if (message.type === 'result') {
          session.sawResult = true;
          session.active = false;
          if (message.subtype !== 'success' || message.is_error) {
            session.sawError = true;
          }
        }

        if (message.type === 'system' || message.type === 'assistant' || message.type === 'result' || message.type === 'stream_event' || message.type === 'tool_use_summary') {
          if (onMessage) {
            onMessage(this._transformMessage(message));
          }
        } else {
          console.log(`[chat-bridge] CLI raw message for session ${sessionId}: type=${message.type || 'unknown'}`);
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      session.stderr += chunk.toString();
    });

    child.on('error', (err) => {
      console.error(`[chat-bridge] CLI session error in ${sessionId}:`, err.message || err);
      session.active = false;
      this.sessions.delete(sessionId);
      if (onError) onError(err);
    });

    child.on('close', (code, signal) => {
      const rawStdout = (session.stdout + session.stdoutBuffer).trim();
      const rawStderr = session.stderr.trim();
      session.active = false;
      if (session.pendingApprovals) {
        session.pendingApprovals.clear();
      }
      if (session.pendingElicitations) {
        session.pendingElicitations.clear();
      }
      this.sessions.delete(sessionId);
      console.log(`[chat-bridge] CLI session ${sessionId} closed: code=${code} signal=${signal || 'none'} stdout=${rawStdout.length}B stderr=${rawStderr.length}B`);

      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        if (onComplete) onComplete({ sdkSessionId: null });
        return;
      }

      if (session.sawResult && !session.sawError) {
        if (code !== 0) {
          console.warn(`[chat-bridge] CLI session ${sessionId} produced a successful result but exited with code=${code}; treating turn as success`);
        }
        if (onComplete) onComplete({ sdkSessionId: session.sdkSessionId || null });
        return;
      }

      if (code === 0) {
        if (!session.sawResult) {
          const { resultText, usage, totalCost, modelUsage, sessionId: resultSessionId, parsed } = extractCliResult(rawStdout);
          if (!parsed && rawStdout) {
            console.warn(`[chat-bridge] CLI stdout for session ${sessionId} was not clean JSON; falling back to raw text preview=${JSON.stringify(rawStdout.slice(0, 240))}`);
          }
          if (!resultText) {
            console.warn(`[chat-bridge] CLI session ${sessionId} returned success with empty result text`);
          }
          if (onMessage) {
            if (resultText) {
              onMessage({ type: 'message_start' });
              onMessage({ type: 'text_start' });
              onMessage({ type: 'text_delta', text: resultText });
            }
            onMessage({
              type: 'result',
              subtype: 'success',
              isError: false,
              usage,
              totalCost,
              modelUsage,
              sessionId: resultSessionId || null,
            });
          }
        }
        if (onComplete) onComplete({ sdkSessionId: session.sdkSessionId || null });
        return;
      }

      console.error(`[chat-bridge] CLI session ${sessionId} failed: stderr=${JSON.stringify(rawStderr.slice(0, 500))} stdout=${JSON.stringify(rawStdout.slice(0, 500))}`);
      const { resultText } = extractCliResult(rawStdout);
      const error = new Error(rawStderr || resultText || `CLI exited with code ${code}`);
      if (onError) onError(error);
    });

    return { sessionId, sdkSessionId: null };
  }

  async stopSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const sdkSessionId = session.sdkSessionId;
    session.active = false;
    if (session.backend === 'cli' && session.process) {
      if (session.pendingApprovals && session.pendingApprovals.size > 0) {
        for (const [requestId, request] of session.pendingApprovals.entries()) {
          try {
            session.process.stdin.write(`${JSON.stringify(buildCliPermissionResponse(requestId, false, request?.input))}\n`);
          } catch {}
        }
        session.pendingApprovals.clear();
      }
      if (session.pendingElicitations && session.pendingElicitations.size > 0) {
        for (const [requestId] of session.pendingElicitations.entries()) {
          try {
            session.process.stdin.write(`${JSON.stringify(buildCliElicitationResponse(requestId, 'cancel'))}\n`);
          } catch {}
        }
        session.pendingElicitations.clear();
      }
      try {
        session.process.stdin.end();
      } catch {}
      try {
        session.process.kill('SIGTERM');
      } catch {}
      this.sessions.delete(sessionId);
      return { sdkSessionId };
    }
    // Deny all pending approval requests so awaiting canUseTool promises resolve.
    if (session.pendingApprovals && session.pendingApprovals.size > 0) {
      for (const resolve of session.pendingApprovals.values()) {
        resolve({ behavior: 'deny', message: 'Session stopped by user.' });
      }
      session.pendingApprovals.clear();
    }
    if (session.pendingElicitations && session.pendingElicitations.size > 0) {
      for (const resolve of session.pendingElicitations.values()) {
        resolve({ action: 'cancel' });
      }
      session.pendingElicitations.clear();
    }
    try {
      session.abortController.abort();
    } catch {}
    this.sessions.delete(sessionId);
    return { sdkSessionId };
  }

  /**
   * Resolve a pending tool approval request.
   * Called by server.js when the user clicks Allow/Deny in the UI.
   */
  respondToApproval(sessionId, requestId, approved) {
    const session = this.sessions.get(sessionId);
    if (!session?.pendingApprovals) return false;
    const pending = session.pendingApprovals.get(requestId);
    if (!pending) return false;
    session.pendingApprovals.delete(requestId);

    if (session.backend === 'cli') {
      if (!session.process?.stdin || session.process.stdin.destroyed) {
        return false;
      }
      try {
        session.process.stdin.write(`${JSON.stringify(buildCliPermissionResponse(requestId, approved, pending.input))}\n`);
        return true;
      } catch (err) {
        console.error(`[chat-bridge] Failed to send CLI approval response for session ${sessionId}:`, err.message || err);
        return false;
      }
    }

    pending(
      approved
        ? { behavior: 'allow' }
        : { behavior: 'deny', message: 'User denied this tool use.' }
    );
    return true;
  }

  respondToElicitation(sessionId, requestId, action, content) {
    const session = this.sessions.get(sessionId);
    if (!session?.pendingElicitations) return false;
    const pending = session.pendingElicitations.get(requestId);
    if (!pending) return false;
    session.pendingElicitations.delete(requestId);

    if (session.backend === 'cli') {
      if (!session.process?.stdin || session.process.stdin.destroyed) {
        return false;
      }
      try {
        session.process.stdin.write(`${JSON.stringify(buildCliElicitationResponse(requestId, action, content))}\n`);
        return true;
      } catch (err) {
        console.error(`[chat-bridge] Failed to send CLI elicitation response for session ${sessionId}:`, err.message || err);
        return false;
      }
    }

    pending({ action, content });
    return true;
  }

  getSdkSessionId(sessionId) {
    const session = this.sessions.get(sessionId);
    return session?.sdkSessionId || null;
  }

  isActive(sessionId) {
    const session = this.sessions.get(sessionId);
    return session?.active ?? false;
  }

  _transformMessage(msg) {
    switch (msg.type) {
      case 'stream_event': {
        const event = msg.event;
        if (!event) return { type: 'unknown', raw: msg };

        switch (event.type) {
          case 'content_block_start': {
            const cb = event.content_block;
            if (cb?.type === 'tool_use') {
              return {
                type: 'tool_use_start',
                toolName: cb.name,
                toolId: cb.id,
                input: {},
                parentToolUseId: msg.parent_tool_use_id || undefined,
              };
            }
            if (cb?.type === 'text') {
              return { type: 'text_start' };
            }
            if (cb?.type === 'thinking') {
              return { type: 'thinking_start' };
            }
            return { type: 'block_start', blockType: cb?.type };
          }

          case 'content_block_delta': {
            const delta = event.delta;
            if (delta?.type === 'text_delta') {
              return { type: 'text_delta', text: delta.text };
            }
            if (delta?.type === 'input_json_delta') {
              return { type: 'tool_input_delta', json: delta.partial_json, parentToolUseId: msg.parent_tool_use_id || undefined };
            }
            if (delta?.type === 'thinking_delta') {
              return { type: 'thinking_delta', text: delta.thinking };
            }
            return { type: 'delta', deltaType: delta?.type };
          }

          case 'content_block_stop': {
            return { type: 'block_stop', index: event.index, parentToolUseId: msg.parent_tool_use_id || undefined };
          }

          case 'message_start':
            return { type: 'message_start' };

          case 'message_delta':
            return {
              type: 'message_delta',
              stopReason: event.delta?.stop_reason,
              usage: event.usage,
            };

          case 'message_stop':
            return { type: 'message_stop' };

          default:
            return { type: 'stream_other', eventType: event.type };
        }
      }

      case 'assistant': {
        const content = msg.message?.content || [];
        const blocks = content.map(block => {
          if (block.type === 'text') {
            return { type: 'text', text: block.text };
          }
          if (block.type === 'tool_use') {
            return {
              type: 'tool_use',
              toolName: block.name,
              toolId: block.id,
              input: block.input,
            };
          }
          if (block.type === 'tool_result') {
            return {
              type: 'tool_result',
              toolId: block.tool_use_id,
              content: block.content,
            };
          }
          return { type: block.type };
        });
        return {
          type: 'assistant_message',
          blocks,
          uuid: msg.uuid,
          sessionId: msg.session_id,
        };
      }

      case 'result': {
        return {
          type: 'result',
          subtype: msg.subtype,
          isError: msg.is_error ?? msg.subtype !== 'success',
          durationMs: msg.duration_ms,
          totalCost: msg.total_cost_usd,
          numTurns: msg.num_turns,
          usage: msg.usage,
          modelUsage: msg.modelUsage,
          errors: msg.errors,
          sessionId: msg.session_id,
        };
      }

      case 'system': {
        // Subagent lifecycle events
        if (msg.subtype === 'task_started') {
          return {
            type: 'task_started',
            taskId: msg.task_id,
            toolUseId: msg.tool_use_id,
            description: msg.description,
            prompt: msg.prompt,
          };
        }
        if (msg.subtype === 'task_progress') {
          return {
            type: 'task_progress',
            taskId: msg.task_id,
            description: msg.description,
            summary: msg.summary,
          };
        }
        if (msg.subtype === 'task_notification') {
          return {
            type: 'task_complete',
            taskId: msg.task_id,
            toolUseId: msg.tool_use_id,
            status: msg.status,
          };
        }
        return {
          type: 'system',
          subtype: msg.subtype,
          sessionId: msg.session_id,
        };
      }

      case 'tool_use_summary': {
        return {
          type: 'tool_use_summary',
          summary: msg.summary,
          toolUseIds: msg.preceding_tool_use_ids,
        };
      }

      default:
        return { type: msg.type || 'unknown', sessionId: msg.session_id };
    }
  }
}

module.exports = { ChatBridge };
