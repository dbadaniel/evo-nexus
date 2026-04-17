import * as React from 'react';
import { MessageResponse } from '../../components/MessageResponse.js';
import { OutputLine } from '../../components/shell/OutputLine.js';
import { Box, Text } from '../../ink.js';
import { jsonStringify } from '../../utils/slowOperations.js';
export function renderToolUseMessage(input) {
    if (!input.uri || !input.server) {
        return null;
    }
    return `Read resource "${input.uri}" from server "${input.server}"`;
}
export function userFacingName() {
    return 'readMcpResource';
}
export function renderToolResultMessage(output, _progressMessagesForMessage, { verbose }) {
    if (!output || !output.contents || output.contents.length === 0) {
        return <Box justifyContent="space-between" overflowX="hidden" width="100%">
        <MessageResponse height={1}>
          <Text dimColor>(No content)</Text>
        </MessageResponse>
      </Box>;
    }
    // Format as JSON for better readability
    // eslint-disable-next-line no-restricted-syntax -- human-facing UI, not tool_result
    const formattedOutput = jsonStringify(output, null, 2);
    return <OutputLine content={formattedOutput} verbose={verbose}/>;
}
//# sourceMappingURL=UI.js.map