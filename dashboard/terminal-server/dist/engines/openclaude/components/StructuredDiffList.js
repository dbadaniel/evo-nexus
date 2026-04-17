import * as React from 'react';
import { Box, NoSelect, Text } from '../ink.js';
import { intersperse } from '../utils/array.js';
import { StructuredDiff } from './StructuredDiff.js';
/** Renders a list of diff hunks with ellipsis separators between them. */
export function StructuredDiffList({ hunks, dim, width, filePath, firstLine, fileContent }) {
    return intersperse(hunks.map(hunk => React.createElement(Box, { flexDirection: "column", key: hunk.newStart },
        React.createElement(StructuredDiff, { patch: hunk, dim: dim, width: width, filePath: filePath, firstLine: firstLine, fileContent: fileContent }))), i => React.createElement(NoSelect, { fromLeftEdge: true, key: `ellipsis-${i}` },
        React.createElement(Text, { dimColor: true }, "...")));
}
//# sourceMappingURL=StructuredDiffList.js.map