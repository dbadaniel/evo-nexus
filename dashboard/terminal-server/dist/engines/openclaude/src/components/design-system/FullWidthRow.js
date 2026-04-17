import * as React from 'react';
import { Box } from '../../ink.js';
export default function FullWidthRow({ children }) {
    return <Box flexDirection="row" width="100%">
      {children}
      <Box flexGrow={1}/>
    </Box>;
}
//# sourceMappingURL=FullWidthRow.js.map