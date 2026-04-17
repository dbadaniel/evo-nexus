/**
 * Mojeek Search API adapter.
 * GET https://www.mojeek.com/search?q=...&fmt=json
 * Auth: optional Bearer for API tier
 */
import { applyDomainFilters, safeHostname } from './types.js';
export const mojeekProvider = {
    name: 'mojeek',
    isConfigured() {
        return Boolean(process.env.MOJEEK_API_KEY);
    },
    async search(input, signal) {
        const start = performance.now();
        const url = new URL('https://www.mojeek.com/search');
        url.searchParams.set('q', input.query);
        url.searchParams.set('fmt', 'json');
        url.searchParams.set('t', '10');
        const headers = {
            'Accept': 'application/json',
        };
        if (process.env.MOJEEK_API_KEY) {
            headers['Authorization'] = `Bearer ${process.env.MOJEEK_API_KEY}`;
        }
        const res = await fetch(url.toString(), { headers, signal });
        if (!res.ok) {
            throw new Error(`Mojeek search error ${res.status}: ${await res.text().catch(() => '')}`);
        }
        const data = await res.json();
        const rawResults = data?.response?.results ?? data?.results ?? [];
        const hits = rawResults.map((r) => ({
            title: r.title ?? '',
            url: r.url ?? '',
            description: r.snippet ?? r.desc,
            source: r.url ? safeHostname(r.url) : undefined,
        }));
        return {
            hits: applyDomainFilters(hits, input),
            providerName: 'mojeek',
            durationSeconds: (performance.now() - start) / 1000,
        };
    },
};
//# sourceMappingURL=mojeek.js.map