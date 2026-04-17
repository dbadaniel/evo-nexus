import * as React from 'react';
import { BLACK_CIRCLE } from 'src/constants/figures.js';
import { getModeColor } from 'src/utils/permissions/PermissionMode.js';
import { Box, Text } from '../../ink.js';
export function renderToolUseMessage() {
    return null;
}
export function renderToolResultMessage(_output, _progressMessagesForMessage, _options) {
    return React.createElement(Box, { flexDirection: "column", marginTop: 1 },
        React.createElement(Box, { flexDirection: "row" },
            React.createElement(Text, { color: getModeColor('plan') }, BLACK_CIRCLE),
            React.createElement(Text, null, " Entered plan mode")),
        React.createElement(Box, { paddingLeft: 2 },
            React.createElement(Text, { dimColor: true }, "Claude is now exploring and designing an implementation approach.")));
}
export function renderToolUseRejectedMessage() {
    return React.createElement(Box, { flexDirection: "row", marginTop: 1 },
        React.createElement(Text, { color: getModeColor('default') }, BLACK_CIRCLE),
        React.createElement(Text, null, " User declined to enter plan mode"));
}
//# sourceMappingURL=UI.js.map