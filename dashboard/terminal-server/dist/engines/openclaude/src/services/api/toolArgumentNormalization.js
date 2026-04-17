const STRING_ARGUMENT_TOOL_FIELDS = {
    Bash: 'command',
    Read: 'file_path',
    Write: 'file_path',
    Edit: 'file_path',
    Glob: 'pattern',
    Grep: 'pattern',
};
function isBlankString(value) {
    return value.trim().length === 0;
}
function isLikelyStructuredObjectLiteral(value) {
    // Match object-like patterns with key-value syntax:
    // {"key":, {key:, {'key':, { "key" :, etc.
    // But NOT bash compound commands like { pwd; } or { echo hi; }
    return /^\s*\{\s*['"]?\w+['"]?\s*:/.test(value);
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function getPlainStringToolArgumentField(toolName) {
    return STRING_ARGUMENT_TOOL_FIELDS[toolName] ?? null;
}
export function hasToolFieldMapping(toolName) {
    return toolName in STRING_ARGUMENT_TOOL_FIELDS;
}
function wrapPlainStringToolArguments(toolName, value) {
    const field = getPlainStringToolArgumentField(toolName);
    if (!field)
        return null;
    return { [field]: value };
}
export function normalizeToolArguments(toolName, rawArguments) {
    if (rawArguments === undefined)
        return {};
    try {
        const parsed = JSON.parse(rawArguments);
        if (isRecord(parsed)) {
            return parsed;
        }
        // Parsed as a non-object JSON value (string, number, boolean, null, array)
        if (typeof parsed === 'string' && !isBlankString(parsed)) {
            return wrapPlainStringToolArguments(toolName, parsed) ?? parsed;
        }
        // For blank strings, booleans, null, arrays — pass through as-is
        // and let Zod schema validation produce a meaningful error
        return parsed;
    }
    catch {
        // rawArguments is not valid JSON — treat as a plain string
        if (isBlankString(rawArguments) || isLikelyStructuredObjectLiteral(rawArguments)) {
            // Blank or looks like a malformed object literal — don't wrap into
            // a tool field to avoid turning garbage into executable input
            return {};
        }
        return wrapPlainStringToolArguments(toolName, rawArguments) ?? {};
    }
}
//# sourceMappingURL=toolArgumentNormalization.js.map