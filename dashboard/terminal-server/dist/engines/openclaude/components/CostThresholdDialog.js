import React from 'react';
import { Box, Link, Text } from '../ink.js';
import { Select } from './CustomSelect/index.js';
import { Dialog } from './design-system/Dialog.js';
import { getAPIProvider } from '../utils/model/providers.js';
function getProviderLabel() {
    const provider = getAPIProvider();
    switch (provider) {
        case 'firstParty':
            return 'Anthropic API';
        case 'bedrock':
            return 'AWS Bedrock';
        case 'vertex':
            return 'Google Vertex';
        case 'foundry':
            return 'Azure Foundry';
        case 'openai':
            return 'OpenAI-compatible API';
        case 'gemini':
            return 'Gemini API';
        default:
            return 'API';
    }
}
export function CostThresholdDialog({ onDone }) {
    const providerLabel = getProviderLabel();
    return (React.createElement(Dialog, { title: `You've spent $5 on the ${providerLabel} this session.`, onCancel: onDone },
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, null, "Learn more about how to monitor your spending:"),
            React.createElement(Link, { url: "https://code.claude.com/docs/en/costs" })),
        React.createElement(Select, { options: [
                {
                    value: 'ok',
                    label: 'Got it, thanks!',
                },
            ], onChange: onDone })));
}
//# sourceMappingURL=CostThresholdDialog.js.map