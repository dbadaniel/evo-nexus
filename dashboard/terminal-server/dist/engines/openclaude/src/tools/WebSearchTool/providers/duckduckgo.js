import { applyDomainFilters } from './types.js';
export const duckduckgoProvider = {
    name: 'duckduckgo',
    isConfigured() {
        // DDG is the default fallback — always available (duck-duck-scrape is a runtime dep)
        return true;
    },
    async search(input, signal) {
        const start = performance.now();
        let search;
        let SafeSearchType;
        try {
            ;
            ({ search, SafeSearchType } = await import('duck-duck-scrape'));
        }
        catch {
            throw new Error('duck-duck-scrape package not installed. Run: npm install duck-duck-scrape');
        }
        if (signal?.aborted)
            throw new DOMException('Aborted', 'AbortError');
        // TODO: duck-duck-scrape doesn't accept AbortSignal — can't cancel in-flight searches
        const response = await search(input.query, { safeSearch: SafeSearchType.STRICT });
        const hits = applyDomainFilters(response.results.map(r => ({
            title: r.title || r.url,
            url: r.url,
            description: r.description ?? undefined,
        })), input);
        return {
            hits,
            providerName: 'duckduckgo',
            durationSeconds: (performance.now() - start) / 1000,
        };
    },
};
//# sourceMappingURL=duckduckgo.js.map