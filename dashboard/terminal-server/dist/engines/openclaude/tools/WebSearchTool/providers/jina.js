/**
 * Jina Search API adapter.
 * GET https://s.jina.ai/?q=...
 * Auth: Authorization: Bearer <key>
 */
import { applyDomainFilters, safeHostname } from './types.js';
export const jinaProvider = {
    name: 'jina',
    isConfigured() {
        return Boolean(process.env.JINA_API_KEY);
    },
    async search(input, signal) {
        const start = performance.now();
        const url = new URL('https://s.jina.ai/');
        url.searchParams.set('q', input.query);
        url.searchParams.set('count', '10');
        const res = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${process.env.JINA_API_KEY}`,
                Accept: 'application/json',
            },
            signal,
        });
        if (!res.ok) {
            throw new Error(`Jina search error ${res.status}: ${await res.text().catch(() => '')}`);
        }
        const data = await res.json();
        const hits = (data.data ?? data.results ?? []).map((r) => ({
            title: r.title ?? '',
            url: r.url ?? '',
            description: r.description ?? r.snippet ?? r.content,
            source: r.url ? safeHostname(r.url) : undefined,
        }));
        return {
            hits: applyDomainFilters(hits, input),
            providerName: 'jina',
            durationSeconds: (performance.now() - start) / 1000,
        };
    },
};
//# sourceMappingURL=jina.js.map