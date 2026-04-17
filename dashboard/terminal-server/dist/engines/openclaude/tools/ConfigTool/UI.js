import React from 'react';
import { MessageResponse } from '../../components/MessageResponse.js';
import { Text } from '../../ink.js';
import { jsonStringify } from '../../utils/slowOperations.js';
export function renderToolUseMessage(input) {
    if (!input.setting)
        return null;
    if (input.value === undefined) {
        return React.createElement(Text, { dimColor: true },
            "Getting ",
            input.setting);
    }
    return React.createElement(Text, { dimColor: true },
        "Setting ",
        input.setting,
        " to ",
        jsonStringify(input.value));
}
export function renderToolResultMessage(content) {
    if (!content.success) {
        return React.createElement(MessageResponse, null,
            React.createElement(Text, { color: "error" },
                "Failed: ",
                content.error));
    }
    if (content.operation === 'get') {
        return React.createElement(MessageResponse, null,
            React.createElement(Text, null,
                React.createElement(Text, { bold: true }, content.setting),
                " = ",
                jsonStringify(content.value)));
    }
    return React.createElement(MessageResponse, null,
        React.createElement(Text, null,
            "Set ",
            React.createElement(Text, { bold: true }, content.setting),
            " to",
            ' ',
            React.createElement(Text, { bold: true }, jsonStringify(content.newValue))));
}
export function renderToolUseRejectedMessage() {
    return React.createElement(Text, { color: "warning" }, "Config change rejected");
}
//# sourceMappingURL=UI.js.map