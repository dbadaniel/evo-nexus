import * as React from 'react';
import { MessageResponse } from '../../components/MessageResponse.js';
import { OutputLine } from '../../components/shell/OutputLine.js';
import { Text } from '../../ink.js';
import { jsonStringify } from '../../utils/slowOperations.js';
export function renderToolUseMessage(input) {
    return input.server ? `List MCP resources from server "${input.server}"` : `List all MCP resources`;
}
export function renderToolResultMessage(output, _progressMessagesForMessage, { verbose }) {
    if (!output || output.length === 0) {
        return <MessageResponse height={1}>
        <Text dimColor>(No resources found)</Text>
      </MessageResponse>;
    }
    // eslint-disable-next-line no-restricted-syntax -- human-facing UI, not tool_result
    const formattedOutput = jsonStringify(output, null, 2);
    return <OutputLine content={formattedOutput} verbose={verbose}/>;
}
//# sourceMappingURL=UI.js.map