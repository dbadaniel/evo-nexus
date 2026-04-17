/**
 * Linkup Search API adapter.
 * POST https://api.linkup.so/v1/search
 * Auth: Authorization: Bearer <key>
 */
import { applyDomainFilters, safeHostname } from './types.js';
export const linkupProvider = {
    name: 'linkup',
    isConfigured() {
        return Boolean(process.env.LINKUP_API_KEY);
    },
    async search(input, signal) {
        const start = performance.now();
        const res = await fetch('https://api.linkup.so/v1/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.LINKUP_API_KEY}`,
            },
            body: JSON.stringify({
                q: input.query,
                search_type: 'standard',
                depth: 'standard',
            }),
            signal,
        });
        if (!res.ok) {
            throw new Error(`Linkup search error ${res.status}: ${await res.text().catch(() => '')}`);
        }
        const data = await res.json();
        const hits = (data.results ?? []).map((r) => ({
            title: r.name ?? r.title ?? '',
            url: r.url ?? '',
            description: r.snippet ?? r.description ?? r.content,
            source: r.url ? safeHostname(r.url) : undefined,
        }));
        return {
            hits: applyDomainFilters(hits, input),
            providerName: 'linkup',
            durationSeconds: (performance.now() - start) / 1000,
        };
    },
};
//# sourceMappingURL=linkup.js.map