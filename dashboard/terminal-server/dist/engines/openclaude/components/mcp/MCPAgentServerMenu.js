import figures from 'figures';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, color, Link, Text, useTheme } from '../../ink.js';
import { useKeybinding } from '../../keybindings/useKeybinding.js';
import { AuthenticationCancelledError, performMCPOAuthFlow } from '../../services/mcp/auth.js';
import { capitalize } from '../../utils/stringUtils.js';
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js';
import { Select } from '../CustomSelect/index.js';
import { Byline } from '../design-system/Byline.js';
import { Dialog } from '../design-system/Dialog.js';
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js';
import { Spinner } from '../Spinner.js';
/**
 * Menu for agent-specific MCP servers.
 * These servers are defined in agent frontmatter and only connect when the agent runs.
 * For HTTP/SSE servers, this allows pre-authentication before using the agent.
 */
export function MCPAgentServerMenu({ agentServer, onCancel, onComplete }) {
    const [theme] = useTheme();
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState(null);
    const [authorizationUrl, setAuthorizationUrl] = useState(null);
    const authAbortControllerRef = useRef(null);
    // Abort OAuth flow on unmount so the callback server is closed even if a
    // parent component's Esc handler navigates away before ours fires.
    useEffect(() => () => authAbortControllerRef.current?.abort(), []);
    // Handle ESC to cancel authentication flow
    const handleEscCancel = useCallback(() => {
        if (isAuthenticating) {
            authAbortControllerRef.current?.abort();
            authAbortControllerRef.current = null;
            setIsAuthenticating(false);
            setAuthorizationUrl(null);
        }
    }, [isAuthenticating]);
    useKeybinding('confirm:no', handleEscCancel, {
        context: 'Confirmation',
        isActive: isAuthenticating
    });
    const handleAuthenticate = useCallback(async () => {
        if (!agentServer.needsAuth || !agentServer.url) {
            return;
        }
        setIsAuthenticating(true);
        setError(null);
        const controller = new AbortController();
        authAbortControllerRef.current = controller;
        try {
            // Create a temporary config for OAuth
            const tempConfig = {
                type: agentServer.transport,
                url: agentServer.url
            };
            await performMCPOAuthFlow(agentServer.name, tempConfig, setAuthorizationUrl, controller.signal);
            onComplete?.(`Authentication successful for ${agentServer.name}. The server will connect when the agent runs.`);
        }
        catch (err) {
            // Don't show error if it was a cancellation
            if (err instanceof Error && !(err instanceof AuthenticationCancelledError)) {
                setError(err.message);
            }
        }
        finally {
            setIsAuthenticating(false);
            authAbortControllerRef.current = null;
        }
    }, [agentServer, onComplete]);
    const capitalizedServerName = capitalize(String(agentServer.name));
    if (isAuthenticating) {
        return React.createElement(Box, { flexDirection: "column", gap: 1, padding: 1 },
            React.createElement(Text, { color: "claude" },
                "Authenticating with ",
                agentServer.name,
                "\u2026"),
            React.createElement(Box, null,
                React.createElement(Spinner, null),
                React.createElement(Text, null, " A browser window will open for authentication")),
            authorizationUrl && React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { dimColor: true }, "If your browser doesn't open automatically, copy this URL manually:"),
                React.createElement(Link, { url: authorizationUrl })),
            React.createElement(Box, { marginLeft: 3 },
                React.createElement(Text, { dimColor: true },
                    "Return here after authenticating in your browser.",
                    ' ',
                    React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Confirmation", fallback: "Esc", description: "go back" }))));
    }
    const menuOptions = [];
    // Only show authenticate option for HTTP/SSE servers
    if (agentServer.needsAuth) {
        menuOptions.push({
            label: agentServer.isAuthenticated ? 'Re-authenticate' : 'Authenticate',
            value: 'auth'
        });
    }
    menuOptions.push({
        label: 'Back',
        value: 'back'
    });
    return React.createElement(Dialog, { title: `${capitalizedServerName} MCP Server`, subtitle: "agent-only", onCancel: onCancel, inputGuide: exitState => exitState.pending ? React.createElement(Text, null,
            "Press ",
            exitState.keyName,
            " again to exit") : React.createElement(Byline, null,
            React.createElement(KeyboardShortcutHint, { shortcut: "\u2191\u2193", action: "navigate" }),
            React.createElement(KeyboardShortcutHint, { shortcut: "Enter", action: "confirm" }),
            React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Confirmation", fallback: "Esc", description: "go back" })) },
        React.createElement(Box, { flexDirection: "column", gap: 0 },
            React.createElement(Box, null,
                React.createElement(Text, { bold: true }, "Type: "),
                React.createElement(Text, { dimColor: true }, agentServer.transport)),
            agentServer.url && React.createElement(Box, null,
                React.createElement(Text, { bold: true }, "URL: "),
                React.createElement(Text, { dimColor: true }, agentServer.url)),
            agentServer.command && React.createElement(Box, null,
                React.createElement(Text, { bold: true }, "Command: "),
                React.createElement(Text, { dimColor: true }, agentServer.command)),
            React.createElement(Box, null,
                React.createElement(Text, { bold: true }, "Used by: "),
                React.createElement(Text, { dimColor: true }, agentServer.sourceAgents.join(', '))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { bold: true }, "Status: "),
                React.createElement(Text, null,
                    color('inactive', theme)(figures.radioOff),
                    " not connected (agent-only)")),
            agentServer.needsAuth && React.createElement(Box, null,
                React.createElement(Text, { bold: true }, "Auth: "),
                agentServer.isAuthenticated ? React.createElement(Text, null,
                    color('success', theme)(figures.tick),
                    " authenticated") : React.createElement(Text, null,
                    color('warning', theme)(figures.triangleUpOutline),
                    " may need authentication"))),
        React.createElement(Box, null,
            React.createElement(Text, { dimColor: true }, "This server connects only when running the agent.")),
        error && React.createElement(Box, null,
            React.createElement(Text, { color: "error" },
                "Error: ",
                error)),
        React.createElement(Box, null,
            React.createElement(Select, { options: menuOptions, onChange: async (value) => {
                    switch (value) {
                        case 'auth':
                            await handleAuthenticate();
                            break;
                        case 'back':
                            onCancel();
                            break;
                    }
                }, onCancel: onCancel })));
}
//# sourceMappingURL=MCPAgentServerMenu.js.map