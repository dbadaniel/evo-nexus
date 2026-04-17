const wiki = {
    type: 'local-jsx',
    name: 'wiki',
    description: 'Initialize and inspect the OpenClaude project wiki',
    argumentHint: '[init|status]',
    immediate: true,
    load: () => import('./wiki.js'),
};
export default wiki;
//# sourceMappingURL=index.js.map