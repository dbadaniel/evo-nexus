import * as React from 'react';
import { Markdown } from 'src/components/Markdown.js';
import { MessageResponse } from 'src/components/MessageResponse.js';
import { RejectedPlanMessage } from 'src/components/messages/UserToolResultMessage/RejectedPlanMessage.js';
import { BLACK_CIRCLE } from 'src/constants/figures.js';
import { getModeColor } from 'src/utils/permissions/PermissionMode.js';
import { Box, Text } from '../../ink.js';
import { getDisplayPath } from '../../utils/file.js';
import { getPlan } from '../../utils/plans.js';
export function renderToolUseMessage() {
    return null;
}
export function renderToolResultMessage(output, _progressMessagesForMessage, { theme: _theme }) {
    const { plan, filePath } = output;
    const isEmpty = !plan || plan.trim() === '';
    const displayPath = filePath ? getDisplayPath(filePath) : '';
    const awaitingLeaderApproval = output.awaitingLeaderApproval;
    // Simplified message for empty plans
    if (isEmpty) {
        return React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Box, { flexDirection: "row" },
                React.createElement(Text, { color: getModeColor('plan') }, BLACK_CIRCLE),
                React.createElement(Text, null, " Exited plan mode")));
    }
    // When awaiting leader approval, show a different message
    if (awaitingLeaderApproval) {
        return React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Box, { flexDirection: "row" },
                React.createElement(Text, { color: getModeColor('plan') }, BLACK_CIRCLE),
                React.createElement(Text, null, " Plan submitted for team lead approval")),
            React.createElement(MessageResponse, null,
                React.createElement(Box, { flexDirection: "column" },
                    filePath && React.createElement(Text, { dimColor: true },
                        "Plan file: ",
                        displayPath),
                    React.createElement(Text, { dimColor: true }, "Waiting for team lead to review and approve..."))));
    }
    return React.createElement(Box, { flexDirection: "column", marginTop: 1 },
        React.createElement(Box, { flexDirection: "row" },
            React.createElement(Text, { color: getModeColor('plan') }, BLACK_CIRCLE),
            React.createElement(Text, null, " User approved Claude's plan")),
        React.createElement(MessageResponse, null,
            React.createElement(Box, { flexDirection: "column" },
                filePath && React.createElement(Text, { dimColor: true },
                    "Plan saved to: ",
                    displayPath,
                    " \u00B7 /plan to edit"),
                React.createElement(Markdown, null, plan))));
}
export function renderToolUseRejectedMessage({ plan }, { theme: _theme }) {
    const planContent = plan ?? getPlan() ?? 'No plan found';
    return React.createElement(Box, { flexDirection: "column" },
        React.createElement(RejectedPlanMessage, { plan: planContent }));
}
//# sourceMappingURL=UI.js.map