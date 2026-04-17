import * as React from 'react';
import { Box } from '../../ink.js';
export default function FullWidthRow({ children }) {
    return React.createElement(Box, { flexDirection: "row", width: "100%" },
        children,
        React.createElement(Box, { flexGrow: 1 }));
}
//# sourceMappingURL=FullWidthRow.js.map