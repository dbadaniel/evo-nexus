/**
 * Search provider adapter types.
 *
 * Every backend implements SearchProvider. WebSearchTool.selectProvider()
 * picks the right one; shared logic (domain filtering, snippet formatting,
 * result-block construction) lives in the tool layer, not in adapters.
 */
// ---------------------------------------------------------------------------
// Flexible response parsing helpers
// ---------------------------------------------------------------------------
const TITLE_KEYS = ['title', 'headline', 'name', 'heading'];
const URL_KEYS = ['url', 'link', 'href', 'uri', 'permalink'];
const DESC_KEYS = [
    'description', 'snippet', 'content', 'preview', 'summary', 'text', 'body',
];
const SOURCE_KEYS = [
    'source', 'domain', 'displayLink', 'displayed_link', 'engine',
];
function firstMatch(obj, keys) {
    for (const k of keys) {
        if (typeof obj?.[k] === 'string' && obj[k])
            return obj[k];
    }
    return undefined;
}
/** Extract a SearchHit from any object shape using well-known field aliases. */
export function normalizeHit(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const title = firstMatch(raw, TITLE_KEYS);
    const url = firstMatch(raw, URL_KEYS);
    if (!title && !url)
        return null;
    const hit = { title: title ?? url, url: url ?? title };
    const desc = firstMatch(raw, DESC_KEYS);
    const source = firstMatch(raw, SOURCE_KEYS);
    if (desc)
        hit.description = desc;
    if (source)
        hit.source = source;
    return hit;
}
// ---------------------------------------------------------------------------
// Domain filtering — shared across ALL providers
// ---------------------------------------------------------------------------
/** Safely extract hostname from a URL string. Returns undefined on parse failure. */
export function safeHostname(url) {
    if (!url)
        return undefined;
    try {
        return new URL(url).hostname;
    }
    catch {
        return undefined;
    }
}
/**
 * Check if a hostname exactly matches a domain or is a subdomain of it.
 * Example: hostMatchesDomain('sub.example.com', 'example.com') → true
 *          hostMatchesDomain('badexample.com', 'example.com') → false
 */
export function hostMatchesDomain(host, domain) {
    if (host === domain)
        return true;
    // Subdomain: must end with `.domain` (not just `domain`)
    return host.endsWith('.' + domain);
}
export function applyDomainFilters(hits, input) {
    let out = hits;
    if (input.blocked_domains?.length) {
        out = out.filter(h => {
            const host = safeHostname(h.url);
            if (!host)
                return true; // can't confirm blocked → keep
            return !input.blocked_domains.some(d => hostMatchesDomain(host, d));
        });
    }
    if (input.allowed_domains?.length) {
        out = out.filter(h => {
            const host = safeHostname(h.url);
            if (!host)
                return false; // can't confirm allowed → drop
            return input.allowed_domains.some(d => hostMatchesDomain(host, d));
        });
    }
    return out;
}
//# sourceMappingURL=types.js.map