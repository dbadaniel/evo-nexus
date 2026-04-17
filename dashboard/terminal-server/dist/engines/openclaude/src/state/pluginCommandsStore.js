import { createStore } from './store.js';
const pluginCommandsStore = createStore([]);
export const getPluginCommandsState = () => pluginCommandsStore.getState();
export const subscribePluginCommands = pluginCommandsStore.subscribe;
export function setPluginCommandsState(commands) {
    pluginCommandsStore.setState(() => [...commands]);
}
//# sourceMappingURL=pluginCommandsStore.js.map