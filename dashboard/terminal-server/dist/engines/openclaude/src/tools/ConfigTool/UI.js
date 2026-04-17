import React from 'react';
import { MessageResponse } from '../../components/MessageResponse.js';
import { Text } from '../../ink.js';
import { jsonStringify } from '../../utils/slowOperations.js';
export function renderToolUseMessage(input) {
    if (!input.setting)
        return null;
    if (input.value === undefined) {
        return <Text dimColor>Getting {input.setting}</Text>;
    }
    return <Text dimColor>
      Setting {input.setting} to {jsonStringify(input.value)}
    </Text>;
}
export function renderToolResultMessage(content) {
    if (!content.success) {
        return <MessageResponse>
        <Text color="error">Failed: {content.error}</Text>
      </MessageResponse>;
    }
    if (content.operation === 'get') {
        return <MessageResponse>
        <Text>
          <Text bold>{content.setting}</Text> = {jsonStringify(content.value)}
        </Text>
      </MessageResponse>;
    }
    return <MessageResponse>
      <Text>
        Set <Text bold>{content.setting}</Text> to{' '}
        <Text bold>{jsonStringify(content.newValue)}</Text>
      </Text>
    </MessageResponse>;
}
export function renderToolUseRejectedMessage() {
    return <Text color="warning">Config change rejected</Text>;
}
//# sourceMappingURL=UI.js.map