import * as React from 'react';
import { Box, Text } from '../../ink.js';
export function renderToolUseMessage() {
    return 'Exiting worktree…';
}
export function renderToolResultMessage(output, _progressMessagesForMessage, _options) {
    const actionLabel = output.action === 'keep' ? 'Kept worktree' : 'Removed worktree';
    return React.createElement(Box, { flexDirection: "column" },
        React.createElement(Text, null,
            actionLabel,
            output.worktreeBranch ? React.createElement(React.Fragment, null,
                ' ',
                "(branch ",
                React.createElement(Text, { bold: true }, output.worktreeBranch),
                ")") : null),
        React.createElement(Text, { dimColor: true },
            "Returned to ",
            output.originalCwd));
}
//# sourceMappingURL=UI.js.map