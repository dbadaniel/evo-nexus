const AUTO_FIX_TOOLS = new Set(['file_edit', 'file_write']);
export function shouldRunAutoFix(toolName, config) {
    if (!config)
        return false;
    return AUTO_FIX_TOOLS.has(toolName);
}
export function buildAutoFixContext(result) {
    if (!result.hasErrors || !result.errorSummary)
        return null;
    return (`<auto_fix_feedback>\n` +
        `AUTO-FIX: The file you just edited has errors. Please fix them:\n\n` +
        `${result.errorSummary}\n\n` +
        `Please fix these errors in the files you just edited. ` +
        `Do not ask the user — just apply the fix.\n` +
        `</auto_fix_feedback>`);
}
//# sourceMappingURL=autoFixHook.js.map