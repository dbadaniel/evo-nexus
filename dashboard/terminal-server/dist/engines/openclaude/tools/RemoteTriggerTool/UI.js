import React from 'react';
import { MessageResponse } from '../../components/MessageResponse.js';
import { Text } from '../../ink.js';
import { countCharInString } from '../../utils/stringUtils.js';
export function renderToolUseMessage(input) {
    return `${input.action ?? ''}${input.trigger_id ? ` ${input.trigger_id}` : ''}`;
}
export function renderToolResultMessage(output) {
    const lines = countCharInString(output.json, '\n') + 1;
    return React.createElement(MessageResponse, null,
        React.createElement(Text, null,
            "HTTP ",
            output.status,
            " ",
            React.createElement(Text, { dimColor: true },
                "(",
                lines,
                " lines)")));
}
//# sourceMappingURL=UI.js.map