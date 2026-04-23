/**
 * ChatLogger — append-only JSONL logs for chat conversations.
 *
 * Stores chat messages in workspace/ADWs/logs/chat/{agentName}_{sessionId}.jsonl
 * Each line is a JSON object: { role, text?, blocks?, files?, ts, uuid? }
 *
 * Special event lines:
 *   { type: "rewind", at: <uuid>, ts }  — marks a rewind point; messages after
 *     the referenced uuid are considered dropped. The reader applies all rewind
 *     markers before returning results (append-only, no destructive truncation).
 *
 * This is the durable source of truth for chat history.
 * sessions.json is a fast-access cache; JSONL survives restarts and cleanups.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sanitizeFiles(files) {
  if (!Array.isArray(files)) {
    return { files: undefined, hadLegacyPayload: false };
  }

  let hadLegacyPayload = false;
  const sanitized = files.map((file) => {
    if (file && (file.base64 || file.path)) {
      hadLegacyPayload = true;
    }
    return {
      name: file?.name,
      type: file?.type,
      previewUrl: file?.previewUrl,
    };
  });

  return { files: sanitized, hadLegacyPayload };
}

function sanitizeMessage(message) {
  const fileInfo = sanitizeFiles(message?.files);
  return {
    message: {
      ...message,
      files: fileInfo.files,
    },
    hadLegacyPayload: fileInfo.hadLegacyPayload,
  };
}

class ChatLogger {
  constructor(workspaceRoot) {
    this.logsDir = path.join(workspaceRoot || process.cwd(), 'workspace', 'ADWs', 'logs', 'chat');
    this._ensureDir();
  }

  _ensureDir() {
    try {
      fs.mkdirSync(this.logsDir, { recursive: true });
    } catch {}
  }

  _logPath(agentName, sessionId) {
    const safe = (agentName || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const shortId = sessionId.slice(0, 8);
    return path.join(this.logsDir, `${safe}_${shortId}.jsonl`);
  }

  /**
   * Append a message to the chat log.
   * Assigns a uuid if the message doesn't already have one.
   * Returns the (possibly assigned) uuid.
   */
  append(agentName, sessionId, message) {
    try {
      const sanitized = sanitizeMessage(message);
      const entry = sanitized.message;
      if (!entry.uuid) {
        entry.uuid = crypto.randomUUID();
      }
      const logPath = this._logPath(agentName, sessionId);
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(logPath, line, 'utf8');
      return entry.uuid;
    } catch (err) {
      console.error(`[chat-logger] Failed to append: ${err.message}`);
      return null;
    }
  }

  /**
   * Append a rewind marker to the JSONL log.
   * The marker records which message uuid was rewound from.
   */
  appendRewindMarker(agentName, sessionId, atUuid) {
    try {
      const marker = { type: 'rewind', at: atUuid, ts: Date.now() };
      const logPath = this._logPath(agentName, sessionId);
      fs.appendFileSync(logPath, JSON.stringify(marker) + '\n', 'utf8');
    } catch (err) {
      console.error(`[chat-logger] Failed to append rewind marker: ${err.message}`);
    }
  }

  /**
   * Read full chat history from JSONL log, applying rewind markers.
   * Returns array of messages, or empty array if not found.
   *
   * Algorithm: play forward. When a { type:"rewind", at:<uuid> } line is
   * encountered, drop all messages strictly after the message with that uuid.
   * Legacy messages without uuid get synthesized deterministic ids.
   */
  read(agentName, sessionId) {
    try {
      const logPath = this._logPath(agentName, sessionId);
      if (!fs.existsSync(logPath)) return [];

      const content = fs.readFileSync(logPath, 'utf8').trim();
      if (!content) return [];

      const rawLines = [];
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        try {
          rawLines.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
        }
      }

      // First pass: assign synthesized uuids to legacy messages (no uuid, not a marker)
      let idx = 0;
      for (const entry of rawLines) {
        if (entry.type !== 'rewind' && !entry.uuid) {
          entry.uuid = `legacy-${sessionId}-${idx}`;
        }
        if (entry.type !== 'rewind') idx++;
      }

      // Second pass: play forward, applying rewind markers
      const messages = [];
      let hadLegacyPayload = false;
      for (const entry of rawLines) {
        if (entry.type === 'rewind') {
          // Drop the message with entry.at uuid AND everything after it
          const cutIdx = messages.findIndex(m => m.uuid === entry.at);
          if (cutIdx !== -1) {
            messages.splice(cutIdx);
          }
          // If uuid not found (e.g. marker for already-rewound content), no-op
        } else {
          const sanitized = sanitizeMessage(entry);
          if (sanitized.hadLegacyPayload) {
            hadLegacyPayload = true;
          }
          messages.push(sanitized.message);
        }
      }

      messages.hadLegacyAttachmentPayload = hadLegacyPayload;
      return messages;
    } catch (err) {
      console.error(`[chat-logger] Failed to read: ${err.message}`);
      return [];
    }
  }

  /**
   * Check if a log exists for a session.
   */
  exists(agentName, sessionId) {
    return fs.existsSync(this._logPath(agentName, sessionId));
  }
}

module.exports = ChatLogger;
