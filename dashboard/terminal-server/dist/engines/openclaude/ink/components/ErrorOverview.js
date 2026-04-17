import React from 'react';
import Box from './Box.js';
import Text from './Text.js';
export default function ErrorOverview({ error }) {
    const message = error.message || 'Unknown error';
    const stackLines = error.stack ? error.stack.split('\n').slice(1) : [];
    return React.createElement(Box, { flexDirection: "column", padding: 1 },
        React.createElement(Box, null,
            React.createElement(Text, { backgroundColor: "ansi:red", color: "ansi:white" },
                ' ',
                "ERROR",
                ' '),
            React.createElement(Text, null,
                " ",
                message)),
        stackLines.length > 0 && React.createElement(Box, { marginTop: 1, flexDirection: "column" }, stackLines.map((line, index) => React.createElement(Text, { key: `${index}:${line}` }, line))));
}
//# sourceMappingURL=ErrorOverview.js.map