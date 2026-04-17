import React from 'react';
import { MessageResponse } from '../../components/MessageResponse.js';
import { TOOL_SUMMARY_MAX_LENGTH } from '../../constants/toolLimits.js';
import { Box, Text } from '../../ink.js';
import { formatFileSize, truncate } from '../../utils/format.js';
export function renderToolUseMessage({ url, prompt }, { verbose }) {
    if (!url) {
        return null;
    }
    if (verbose) {
        return `url: "${url}"${verbose && prompt ? `, prompt: "${prompt}"` : ''}`;
    }
    return url;
}
export function renderToolUseProgressMessage() {
    return <MessageResponse height={1}>
      <Text dimColor>Fetching…</Text>
    </MessageResponse>;
}
export function renderToolResultMessage({ bytes, code, codeText, result }, _progressMessagesForMessage, { verbose }) {
    const formattedSize = formatFileSize(bytes);
    if (verbose) {
        return <Box flexDirection="column">
        <MessageResponse height={1}>
          <Text>
            Received <Text bold>{formattedSize}</Text> ({code} {codeText})
          </Text>
        </MessageResponse>
        <Box flexDirection="column">
          <Text>{result}</Text>
        </Box>
      </Box>;
    }
    return <MessageResponse height={1}>
      <Text>
        Received <Text bold>{formattedSize}</Text> ({code} {codeText})
      </Text>
    </MessageResponse>;
}
export function getToolUseSummary(input) {
    if (!input?.url) {
        return null;
    }
    return truncate(input.url, TOOL_SUMMARY_MAX_LENGTH);
}
//# sourceMappingURL=UI.js.map