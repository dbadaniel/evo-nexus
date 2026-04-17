/**
 * Bing Web Search API adapter.
 * GET https://api.bing.microsoft.com/v7.0/search?q=...
 * Auth: Ocp-Apim-Subscription-Key: <key>
 */
import { applyDomainFilters } from './types.js';
export const bingProvider = {
    name: 'bing',
    isConfigured() {
        return Boolean(process.env.BING_API_KEY);
    },
    async search(input, signal) {
        const start = performance.now();
        const url = new URL('https://api.bing.microsoft.com/v7.0/search');
        url.searchParams.set('q', input.query);
        url.searchParams.set('count', '15');
        const res = await fetch(url.toString(), {
            headers: { 'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY },
            signal,
        });
        if (!res.ok) {
            throw new Error(`Bing search error ${res.status}: ${await res.text().catch(() => '')}`);
        }
        const data = await res.json();
        const hits = (data.webPages?.value ?? []).map((r) => ({
            title: r.name ?? '',
            url: r.url ?? '',
            description: r.snippet,
            source: r.displayUrl,
        }));
        return {
            hits: applyDomainFilters(hits, input),
            providerName: 'bing',
            durationSeconds: (performance.now() - start) / 1000,
        };
    },
};
//# sourceMappingURL=bing.js.map