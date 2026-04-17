/**
 * Normalize an agent identifier for case-insensitive, hyphen/underscore-agnostic matching.
 */
function normalize(key) {
    return key.toLowerCase().replace(/[-_]/g, '');
}
/**
 * Look up agent.routing by name or subagent_type, then resolve via agent.models.
 *
 * Priority: name > subagentType > "default" > null (use global provider)
 */
export function resolveAgentProvider(name, subagentType, settings) {
    if (!settings)
        return null;
    const routing = settings.agentRouting;
    const models = settings.agentModels;
    if (!routing || !models)
        return null;
    // Build normalized lookup from routing config.
    // Warn on duplicate normalized keys (e.g. "explore-agent" and "explore_agent"
    // both normalize to "exploreagent") to prevent silent shadowing.
    const normalizedRouting = new Map();
    for (const [key, value] of Object.entries(routing)) {
        const nk = normalize(key);
        if (normalizedRouting.has(nk)) {
            console.error(`[agentRouting] Warning: routing key "${key}" collides with an existing key after normalization (both map to "${nk}"). First entry wins.`);
        }
        if (!normalizedRouting.has(nk)) {
            normalizedRouting.set(nk, value);
        }
    }
    // Try name first, then subagentType, then "default"
    const candidates = [name, subagentType, 'default'].filter(Boolean);
    let modelName;
    for (const candidate of candidates) {
        const match = normalizedRouting.get(normalize(candidate));
        if (match) {
            modelName = match;
            break;
        }
    }
    if (!modelName)
        return null;
    const modelConfig = models[modelName];
    if (!modelConfig)
        return null;
    return {
        model: modelName,
        baseURL: modelConfig.base_url,
        apiKey: modelConfig.api_key,
    };
}
//# sourceMappingURL=agentRouting.js.map