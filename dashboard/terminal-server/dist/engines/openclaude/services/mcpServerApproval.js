import React from 'react';
import { MCPServerApprovalDialog } from '../components/MCPServerApprovalDialog.js';
import { MCPServerMultiselectDialog } from '../components/MCPServerMultiselectDialog.js';
import { KeybindingSetup } from '../keybindings/KeybindingProviderSetup.js';
import { AppStateProvider } from '../state/AppState.js';
import { getMcpConfigsByScope } from './mcp/config.js';
import { getProjectMcpServerStatus } from './mcp/utils.js';
/**
 * Show MCP server approval dialogs for pending project servers.
 * Uses the provided Ink root to render (reusing the existing instance
 * from main.tsx instead of creating a separate one).
 */
export async function handleMcpjsonServerApprovals(root) {
    const { servers: projectServers } = getMcpConfigsByScope('project');
    const pendingServers = Object.keys(projectServers).filter(serverName => getProjectMcpServerStatus(serverName) === 'pending');
    if (pendingServers.length === 0) {
        return;
    }
    await new Promise(resolve => {
        const done = () => void resolve();
        if (pendingServers.length === 1 && pendingServers[0] !== undefined) {
            const serverName = pendingServers[0];
            root.render(React.createElement(AppStateProvider, null,
                React.createElement(KeybindingSetup, null,
                    React.createElement(MCPServerApprovalDialog, { serverName: serverName, onDone: done }))));
        }
        else {
            root.render(React.createElement(AppStateProvider, null,
                React.createElement(KeybindingSetup, null,
                    React.createElement(MCPServerMultiselectDialog, { serverNames: pendingServers, onDone: done }))));
        }
    });
}
//# sourceMappingURL=mcpServerApproval.js.map