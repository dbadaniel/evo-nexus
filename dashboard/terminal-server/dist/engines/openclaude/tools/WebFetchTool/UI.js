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
    return React.createElement(MessageResponse, { height: 1 },
        React.createElement(Text, { dimColor: true }, "Fetching\u2026"));
}
export function renderToolResultMessage({ bytes, code, codeText, result }, _progressMessagesForMessage, { verbose }) {
    const formattedSize = formatFileSize(bytes);
    if (verbose) {
        return React.createElement(Box, { flexDirection: "column" },
            React.createElement(MessageResponse, { height: 1 },
                React.createElement(Text, null,
                    "Received ",
                    React.createElement(Text, { bold: true }, formattedSize),
                    " (",
                    code,
                    " ",
                    codeText,
                    ")")),
            React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, null, result)));
    }
    return React.createElement(MessageResponse, { height: 1 },
        React.createElement(Text, null,
            "Received ",
            React.createElement(Text, { bold: true }, formattedSize),
            " (",
            code,
            " ",
            codeText,
            ")"));
}
export function getToolUseSummary(input) {
    if (!input?.url) {
        return null;
    }
    return truncate(input.url, TOOL_SUMMARY_MAX_LENGTH);
}
//# sourceMappingURL=UI.js.map