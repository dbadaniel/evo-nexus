import { shouldUseCodexTransport } from '../../services/api/providerConfig.js';
import { isEnvTruthy } from '../envUtils.js';
export function getAPIProvider() {
    if (isEnvTruthy(process.env.NVIDIA_NIM)) {
        return 'nvidia-nim';
    }
    if (isEnvTruthy(process.env.MINIMAX_API_KEY)) {
        return 'minimax';
    }
    return isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI)
        ? 'gemini'
        :
            isEnvTruthy(process.env.CLAUDE_CODE_USE_MISTRAL)
                ? 'mistral'
                : isEnvTruthy(process.env.CLAUDE_CODE_USE_GITHUB)
                    ? 'github'
                    : isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI)
                        ? isCodexModel()
                            ? 'codex'
                            : 'openai'
                        : isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
                            ? 'bedrock'
                            : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
                                ? 'vertex'
                                : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
                                    ? 'foundry'
                                    : 'firstParty';
}
export function usesAnthropicAccountFlow() {
    return getAPIProvider() === 'firstParty';
}
function isCodexModel() {
    return shouldUseCodexTransport(process.env.OPENAI_MODEL || '', process.env.OPENAI_BASE_URL ?? process.env.OPENAI_API_BASE);
}
export function getAPIProviderForStatsig() {
    return getAPIProvider();
}
/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl() {
    const baseUrl = process.env.ANTHROPIC_BASE_URL;
    if (!baseUrl) {
        return true;
    }
    try {
        const host = new URL(baseUrl).host;
        const allowedHosts = ['api.anthropic.com'];
        if (process.env.USER_TYPE === 'ant') {
            allowedHosts.push('api-staging.anthropic.com');
        }
        return allowedHosts.includes(host);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=providers.js.map