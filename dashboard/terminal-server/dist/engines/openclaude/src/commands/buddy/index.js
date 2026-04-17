const buddy = {
    type: 'local-jsx',
    name: 'buddy',
    description: 'Hatch, pet, and manage your Open Claude companion',
    immediate: true,
    argumentHint: '[status|mute|unmute|help]',
    load: () => import('./buddy.js'),
};
export default buddy;
//# sourceMappingURL=index.js.map