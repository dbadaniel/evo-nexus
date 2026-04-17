import * as React from 'react';
import { Box, NoSelect, Text } from '../ink.js';
import { intersperse } from '../utils/array.js';
import { StructuredDiff } from './StructuredDiff.js';
/** Renders a list of diff hunks with ellipsis separators between them. */
export function StructuredDiffList({ hunks, dim, width, filePath, firstLine, fileContent }) {
    return intersperse(hunks.map(hunk => <Box flexDirection="column" key={hunk.newStart}>
        <StructuredDiff patch={hunk} dim={dim} width={width} filePath={filePath} firstLine={firstLine} fileContent={fileContent}/>
      </Box>), i => <NoSelect fromLeftEdge key={`ellipsis-${i}`}>
        <Text dimColor>...</Text>
      </NoSelect>);
}
//# sourceMappingURL=StructuredDiffList.js.map