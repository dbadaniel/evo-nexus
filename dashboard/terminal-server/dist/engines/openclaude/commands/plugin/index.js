const plugin = {
    type: 'local-jsx',
    name: 'plugin',
    aliases: ['plugins', 'marketplace'],
    description: 'Manage Claude Code plugins',
    immediate: true,
    load: () => import('./plugin.js')
};
export default plugin;
//# sourceMappingURL=index.js.map