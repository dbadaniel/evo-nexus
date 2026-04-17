/**
 * OpenClaude Bridge — Integrates the incorporated OpenClaude engine directly.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

class OpenClaudeBridge {
  constructor(server) {
    this.server = server;
    this.sessions = new Map();
  }

  /**
   * Dynamically loads the ESM modules for OpenClaude.
   */
  async _loadEngine() {
    if (this.QueryEngine) return;

    // We use dynamic import to load the transpiled ESM modules.
    const engineModule = await import('../dist/engines/openclaude/QueryEngine.js');
    const toolsModule = await import('../dist/engines/openclaude/tools.js');
    const stateModule = await import('../dist/engines/openclaude/state/AppStateStore.js');
    const cacheModule = await import('../dist/engines/openclaude/utils/fileStateCache.js');

    this.QueryEngine = engineModule.QueryEngine;
    this.getTools = toolsModule.getTools;
    this.getDefaultAppState = stateModule.getDefaultAppState;
    this.FileStateCache = cacheModule.FileStateCache;
    this.READ_FILE_STATE_CACHE_SIZE = cacheModule.READ_FILE_STATE_CACHE_SIZE;
  }

  async startSession(ws, sessionId, payload) {
    await this._loadEngine();

    const { working_directory, model, message } = payload;
    const cwd = working_directory || process.cwd();

    // Setup state and cache for this session
    const appState = this.getDefaultAppState();
    const fileCache = new this.FileStateCache(this.READ_FILE_STATE_CACHE_SIZE, 25 * 1024 * 1024);

    const session = {
      ws,
      engine: null,
      interrupted: false,
      pendingRequests: new Map(),
      toolNameById: new Map()
    };

    this.sessions.set(sessionId, session);

    try {
      session.engine = new this.QueryEngine({
        cwd,
        tools: this.getTools(appState.toolPermissionContext),
        includePartialMessages: true,
        userSpecifiedModel: model || 'gpt-4o',
        fallbackModel: model || 'gpt-4o',
        readFileCache: fileCache,
        canUseTool: async (tool, input, context, assistantMsg, toolUseID) => {
          if (toolUseID) {
            session.toolNameById.set(toolUseID, tool.name);
          }

          // 1. Notify UI that a tool call started
          ws.send(JSON.stringify({
            type: 'tool_use',
            tool: tool.name,
            input,
            id: toolUseID
          }));

          // 2. Check if we need approval (In EvoNexus, we usually ask the user)
          // For now, we mimic the Anthropic bridge behavior
          const promptId = randomUUID();
          ws.send(JSON.stringify({
            type: 'approval_required',
            prompt_id: promptId,
            tool: tool.name,
            input
          }));

          return new Promise((resolve) => {
            session.pendingRequests.set(promptId, (reply) => {
              if (reply === 'allow' || reply === 'yes' || reply === 'y') {
                resolve({ behavior: 'allow' });
              } else {
                resolve({ behavior: 'deny', reason: 'User denied via Dashboard' });
              }
            });
          });
        },
        getAppState: () => appState,
        setAppState: (updater) => { /* Logic to update appState if needed */ }
      });

      const generator = session.engine.submitMessage(message);

      for await (const msg of generator) {
        if (session.interrupted) break;

        if (msg.type === 'stream_event') {
          if (msg.event.type === 'content_block_delta' && msg.event.delta.type === 'text_delta') {
            ws.send(JSON.stringify({
              type: 'text',
              text: msg.event.delta.text
            }));
          }
        } else if (msg.type === 'user') {
          // Process tool results to show them in the UI
          const content = msg.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_result') {
                ws.send(JSON.stringify({
                  type: 'tool_result',
                  tool: session.toolNameById.get(block.tool_use_id) || 'unknown',
                  result: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
                  isError: block.is_error
                }));
              }
            }
          }
        }
      }

      if (!session.interrupted) {
        ws.send(JSON.stringify({ type: 'done' }));
      }

    } catch (err) {
      console.error('[OpenClaudeBridge] Error:', err);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    } finally {
      this.sessions.delete(sessionId);
    }
  }

  handleMessage(sessionId, payload) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (payload.action === 'approval_response') {
      const { prompt_id, response } = payload;
      if (session.pendingRequests.has(prompt_id)) {
        session.pendingRequests.get(prompt_id)(response);
        session.pendingRequests.delete(prompt_id);
      }
    } else if (payload.action === 'interrupt') {
      session.interrupted = true;
      if (session.engine) session.engine.interrupt();
    }
  }

  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.interrupted = true;
      if (session.engine) session.engine.interrupt();
      this.sessions.delete(sessionId);
    }
  }
}

module.exports = { OpenClaudeBridge };
