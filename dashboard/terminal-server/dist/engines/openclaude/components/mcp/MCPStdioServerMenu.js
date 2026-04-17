import figures from 'figures';
import React, { useState } from 'react';
import { useExitOnCtrlCDWithKeybindings } from '../../hooks/useExitOnCtrlCDWithKeybindings.js';
import { Box, color, Text, useTheme } from '../../ink.js';
import { getMcpConfigByName } from '../../services/mcp/config.js';
import { useMcpReconnect, useMcpToggleEnabled } from '../../services/mcp/MCPConnectionManager.js';
import { describeMcpConfigFilePath, filterMcpPromptsByServer } from '../../services/mcp/utils.js';
import { useAppState } from '../../state/AppState.js';
import { errorMessage } from '../../utils/errors.js';
import { capitalize } from '../../utils/stringUtils.js';
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js';
import { Select } from '../CustomSelect/index.js';
import { Byline } from '../design-system/Byline.js';
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js';
import { Spinner } from '../Spinner.js';
import { CapabilitiesSection } from './CapabilitiesSection.js';
import { handleReconnectError, handleReconnectResult } from './utils/reconnectHelpers.js';
export function MCPStdioServerMenu({ server, serverToolsCount, onViewTools, onCancel, onComplete, borderless = false }) {
    const [theme] = useTheme();
    const exitState = useExitOnCtrlCDWithKeybindings();
    const mcp = useAppState(s => s.mcp);
    const reconnectMcpServer = useMcpReconnect();
    const toggleMcpServer = useMcpToggleEnabled();
    const [isReconnecting, setIsReconnecting] = useState(false);
    const handleToggleEnabled = React.useCallback(async () => {
        const wasEnabled = server.client.type !== 'disabled';
        try {
            await toggleMcpServer(server.name);
            // Return to the server list so user can continue managing other servers
            onCancel();
        }
        catch (err) {
            const action = wasEnabled ? 'disable' : 'enable';
            onComplete(`Failed to ${action} MCP server '${server.name}': ${errorMessage(err)}`);
        }
    }, [server.client.type, server.name, toggleMcpServer, onCancel, onComplete]);
    const capitalizedServerName = capitalize(String(server.name));
    // Count MCP prompts for this server (skills are shown in /skills, not here)
    const serverCommandsCount = filterMcpPromptsByServer(mcp.commands, server.name).length;
    const menuOptions = [];
    // Only show "View tools" if server is not disabled and has tools
    if (server.client.type !== 'disabled' && serverToolsCount > 0) {
        menuOptions.push({
            label: 'View tools',
            value: 'tools'
        });
    }
    // Only show reconnect option if the server is not disabled
    if (server.client.type !== 'disabled') {
        menuOptions.push({
            label: 'Reconnect',
            value: 'reconnectMcpServer'
        });
    }
    menuOptions.push({
        label: server.client.type !== 'disabled' ? 'Disable' : 'Enable',
        value: 'toggle-enabled'
    });
    // If there are no other options, add a back option so Select handles escape
    if (menuOptions.length === 0) {
        menuOptions.push({
            label: 'Back',
            value: 'back'
        });
    }
    if (isReconnecting) {
        return React.createElement(Box, { flexDirection: "column", gap: 1, padding: 1 },
            React.createElement(Text, { color: "text" },
                "Reconnecting to ",
                React.createElement(Text, { bold: true }, server.name)),
            React.createElement(Box, null,
                React.createElement(Spinner, null),
                React.createElement(Text, null, " Restarting MCP server process")),
            React.createElement(Text, { dimColor: true }, "This may take a few moments."));
    }
    return React.createElement(Box, { flexDirection: "column" },
        React.createElement(Box, { flexDirection: "column", paddingX: 1, borderStyle: borderless ? undefined : 'round' },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { bold: true },
                    capitalizedServerName,
                    " MCP Server")),
            React.createElement(Box, { flexDirection: "column", gap: 0 },
                React.createElement(Box, null,
                    React.createElement(Text, { bold: true }, "Status: "),
                    server.client.type === 'disabled' ? React.createElement(Text, null,
                        color('inactive', theme)(figures.radioOff),
                        " disabled") : server.client.type === 'connected' ? React.createElement(Text, null,
                        color('success', theme)(figures.tick),
                        " connected") : server.client.type === 'pending' ? React.createElement(React.Fragment, null,
                        React.createElement(Text, { dimColor: true }, figures.radioOff),
                        React.createElement(Text, null, " connecting\u2026")) : React.createElement(Text, null,
                        color('error', theme)(figures.cross),
                        " failed")),
                React.createElement(Box, null,
                    React.createElement(Text, { bold: true }, "Command: "),
                    React.createElement(Text, { dimColor: true }, server.config.command)),
                server.config.args && server.config.args.length > 0 && React.createElement(Box, null,
                    React.createElement(Text, { bold: true }, "Args: "),
                    React.createElement(Text, { dimColor: true }, server.config.args.join(' '))),
                React.createElement(Box, null,
                    React.createElement(Text, { bold: true }, "Config location: "),
                    React.createElement(Text, { dimColor: true }, describeMcpConfigFilePath(getMcpConfigByName(server.name)?.scope ?? 'dynamic'))),
                server.client.type === 'connected' && React.createElement(CapabilitiesSection, { serverToolsCount: serverToolsCount, serverPromptsCount: serverCommandsCount, serverResourcesCount: mcp.resources[server.name]?.length || 0 }),
                server.client.type === 'connected' && serverToolsCount > 0 && React.createElement(Box, null,
                    React.createElement(Text, { bold: true }, "Tools: "),
                    React.createElement(Text, { dimColor: true },
                        serverToolsCount,
                        " tools"))),
            menuOptions.length > 0 && React.createElement(Box, { marginTop: 1 },
                React.createElement(Select, { options: menuOptions, onChange: async (value) => {
                        if (value === 'tools') {
                            onViewTools();
                        }
                        else if (value === 'reconnectMcpServer') {
                            setIsReconnecting(true);
                            try {
                                const result = await reconnectMcpServer(server.name);
                                const { message } = handleReconnectResult(result, server.name);
                                onComplete?.(message);
                            }
                            catch (err_0) {
                                onComplete?.(handleReconnectError(err_0, server.name));
                            }
                            finally {
                                setIsReconnecting(false);
                            }
                        }
                        else if (value === 'toggle-enabled') {
                            await handleToggleEnabled();
                        }
                        else if (value === 'back') {
                            onCancel();
                        }
                    }, onCancel: onCancel }))),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { dimColor: true, italic: true }, exitState.pending ? React.createElement(React.Fragment, null,
                "Press ",
                exitState.keyName,
                " again to exit") : React.createElement(Byline, null,
                React.createElement(KeyboardShortcutHint, { shortcut: "\u2191\u2193", action: "navigate" }),
                React.createElement(KeyboardShortcutHint, { shortcut: "Enter", action: "select" }),
                React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Confirmation", fallback: "Esc", description: "back" })))));
}
//# sourceMappingURL=MCPStdioServerMenu.js.map