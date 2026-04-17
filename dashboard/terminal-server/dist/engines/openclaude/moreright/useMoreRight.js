// Stub for external builds — the real hook is internal only.
//
// Self-contained: no relative imports. Typecheck sees this file at
// scripts/external-stubs/src/moreright/ before overlay, where ../types/
// would resolve to scripts/external-stubs/src/types/ (doesn't exist).
export function useMoreRight(_args) {
    return {
        onBeforeQuery: async () => true,
        onTurnComplete: async () => { },
        render: () => null
    };
}
//# sourceMappingURL=useMoreRight.js.map