import React from 'react';
import { getOriginalCwd } from '../../../bootstrap/state.js';
import { Box, Text } from '../../../ink.js';
import { sanitizeToolNameForAnalytics } from '../../../services/analytics/metadata.js';
import { env } from '../../../utils/env.js';
import { shouldShowAlwaysAllowOptions } from '../../../utils/permissions/permissionsLoader.js';
import { usePermissionRequestLogging } from '../hooks.js';
import { PermissionDialog } from '../PermissionDialog.js';
import { PermissionPrompt, } from '../PermissionPrompt.js';
import { PermissionRuleExplanation } from '../PermissionRuleExplanation.js';
import { logUnaryPermissionEvent } from '../utils.js';
export function MonitorPermissionRequest({ toolUseConfirm, onDone, onReject, workerBadge, }) {
    const { command, description } = toolUseConfirm.input;
    usePermissionRequestLogging(toolUseConfirm, {
        completion_type: 'tool_use_single',
        language_name: 'none',
    });
    const handleSelect = (value, feedback) => {
        switch (value) {
            case 'yes': {
                logUnaryPermissionEvent({
                    completion_type: 'tool_use_single',
                    event: 'accept',
                    metadata: {
                        language_name: 'none',
                        message_id: toolUseConfirm.assistantMessage.message.id,
                        platform: env.platform,
                    },
                });
                toolUseConfirm.onAllow(toolUseConfirm.input, [], feedback);
                onDone();
                break;
            }
            case 'yes-dont-ask-again': {
                logUnaryPermissionEvent({
                    completion_type: 'tool_use_single',
                    event: 'accept',
                    metadata: {
                        language_name: 'none',
                        message_id: toolUseConfirm.assistantMessage.message.id,
                        platform: env.platform,
                    },
                });
                // Save the rule under 'Bash' toolName because checkPermissions
                // delegates to bashToolHasPermission which matches rules against
                // BashTool. Using 'Monitor' here would create a rule that's never
                // checked. Command-specific prefix (like BashTool's shellRuleMatching).
                const cmdForRule = command?.trim() || '';
                const prefix = cmdForRule.split(/\s+/).slice(0, 2).join(' ');
                toolUseConfirm.onAllow(toolUseConfirm.input, prefix ? [
                    {
                        type: 'addRules',
                        rules: [{ toolName: 'Bash', ruleContent: `${prefix}:*` }],
                        behavior: 'allow',
                        destination: 'localSettings',
                    },
                ] : []);
                onDone();
                break;
            }
            case 'no': {
                logUnaryPermissionEvent({
                    completion_type: 'tool_use_single',
                    event: 'reject',
                    metadata: {
                        language_name: 'none',
                        message_id: toolUseConfirm.assistantMessage.message.id,
                        platform: env.platform,
                    },
                });
                toolUseConfirm.onReject(feedback);
                onReject();
                onDone();
                break;
            }
        }
    };
    const handleCancel = () => {
        logUnaryPermissionEvent({
            completion_type: 'tool_use_single',
            event: 'reject',
            metadata: {
                language_name: 'none',
                message_id: toolUseConfirm.assistantMessage.message.id,
                platform: env.platform,
            },
        });
        toolUseConfirm.onReject();
        onReject();
        onDone();
    };
    const showAlwaysAllow = shouldShowAlwaysAllowOptions();
    const originalCwd = getOriginalCwd();
    const options = [
        {
            label: 'Yes',
            value: 'yes',
            feedbackConfig: { type: 'accept' },
        },
    ];
    if (showAlwaysAllow) {
        options.push({
            label: (React.createElement(Text, null,
                "Yes, and don't ask again for",
                ' ',
                React.createElement(Text, { bold: true }, "Monitor"),
                " commands in",
                ' ',
                React.createElement(Text, { bold: true }, originalCwd))),
            value: 'yes-dont-ask-again',
        });
    }
    options.push({
        label: 'No',
        value: 'no',
        feedbackConfig: { type: 'reject' },
    });
    const toolAnalyticsContext = {
        toolName: sanitizeToolNameForAnalytics(toolUseConfirm.tool.name),
        isMcp: toolUseConfirm.tool.isMcp ?? false,
    };
    return (React.createElement(PermissionDialog, { title: "Monitor", workerBadge: workerBadge },
        React.createElement(Box, { flexDirection: "column", paddingX: 2, paddingY: 1 },
            React.createElement(Text, null,
                "Monitor(",
                command ?? '',
                ")"),
            description ? (React.createElement(Text, { dimColor: true }, description)) : null),
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(PermissionRuleExplanation, { permissionResult: toolUseConfirm.permissionResult, toolType: "tool" }),
            React.createElement(PermissionPrompt, { options: options, onSelect: handleSelect, onCancel: handleCancel, toolAnalyticsContext: toolAnalyticsContext }))));
}
//# sourceMappingURL=MonitorPermissionRequest.js.map