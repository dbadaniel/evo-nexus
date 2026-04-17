export function sanitizeWikiSlug(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}
export function summarizeText(input, maxLength = 280) {
    const normalized = input.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return 'No summary available.';
    }
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
export function extractTitleFromText(fallbackName, content) {
    const firstNonEmptyLine = content
        .split('\n')
        .map(line => line.trim())
        .find(Boolean);
    if (!firstNonEmptyLine) {
        return fallbackName;
    }
    return firstNonEmptyLine.replace(/^#+\s*/, '') || fallbackName;
}
//# sourceMappingURL=utils.js.map