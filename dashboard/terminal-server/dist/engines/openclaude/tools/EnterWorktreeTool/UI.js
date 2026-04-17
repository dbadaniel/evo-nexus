import * as React from 'react';
import { Box, Text } from '../../ink.js';
export function renderToolUseMessage() {
    return 'Creating worktree…';
}
export function renderToolResultMessage(output, _progressMessagesForMessage, _options) {
    return React.createElement(Box, { flexDirection: "column" },
        React.createElement(Text, null,
            "Switched to worktree on branch ",
            React.createElement(Text, { bold: true }, output.worktreeBranch)),
        React.createElement(Text, { dimColor: true }, output.worktreePath));
}
//# sourceMappingURL=UI.js.map