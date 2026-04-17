import * as React from 'react';
import { AgentsMenu } from '../../components/agents/AgentsMenu.js';
import { getTools } from '../../tools.js';
export async function call(onDone, context) {
    const appState = context.getAppState();
    const permissionContext = appState.toolPermissionContext;
    const tools = getTools(permissionContext);
    return React.createElement(AgentsMenu, { tools: tools, onExit: onDone });
}
//# sourceMappingURL=agents.js.map