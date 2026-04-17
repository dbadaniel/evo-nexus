import axios from 'axios';
import { logForDebugging } from '../debug.js';
import { getAPIProvider } from './providers.js';
const DISCOVERY_TIMEOUT_MS = 5000;
const DISCOVERED_MODEL_DESCRIPTION = 'Discovered from OpenAI-compatible endpoint';
function getNormalizedOpenAIBaseUrl() {
    return (process.env.OPENAI_BASE_URL ??
        process.env.OPENAI_API_BASE ??
        'https://api.openai.com/v1').replace(/\/+$/, '');
}
function isAzureOpenAIBaseUrl(baseUrl) {
    try {
        const hostname = new URL(baseUrl).hostname.toLowerCase();
        return (hostname.endsWith('.openai.azure.com') ||
            hostname.endsWith('.cognitiveservices.azure.com'));
    }
    catch {
        return false;
    }
}
function getOpenAIAuthHeaders(baseUrl) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
        return {};
    }
    const headers = {
        Authorization: `Bearer ${apiKey}`,
    };
    if (isAzureOpenAIBaseUrl(baseUrl)) {
        headers['api-key'] = apiKey;
    }
    return headers;
}
function getModelListUrls(baseUrl) {
    const primary = baseUrl.endsWith('/v1')
        ? `${baseUrl}/models`
        : `${baseUrl}/v1/models`;
    const secondary = `${baseUrl}/models`;
    const apiVersion = process.env.OPENAI_API_VERSION?.trim();
    const addApiVersion = apiVersion && isAzureOpenAIBaseUrl(baseUrl)
        ? (url) => {
            try {
                const parsed = new URL(url);
                parsed.searchParams.set('api-version', apiVersion);
                return parsed.toString();
            }
            catch {
                return url;
            }
        }
        : (url) => url;
    if (primary === secondary) {
        return [addApiVersion(primary)];
    }
    return [addApiVersion(primary), addApiVersion(secondary)];
}
function getOllamaTagsUrl(baseUrl) {
    try {
        const parsed = new URL(baseUrl);
        const normalizedPath = parsed.pathname.replace(/\/+$/, '');
        const pathPrefix = normalizedPath.endsWith('/v1')
            ? normalizedPath.slice(0, -3)
            : normalizedPath;
        const tagsPath = `${pathPrefix}/api/tags`.replace(/\/{2,}/g, '/');
        return `${parsed.origin}${tagsPath}`;
    }
    catch {
        return null;
    }
}
function uniqueModelNames(modelNames) {
    const seen = new Set();
    const unique = [];
    for (const modelName of modelNames) {
        const trimmed = modelName.trim();
        if (!trimmed || seen.has(trimmed)) {
            continue;
        }
        seen.add(trimmed);
        unique.push(trimmed);
    }
    return unique;
}
async function fetchOpenAIModels(urls, headers) {
    for (const url of urls) {
        try {
            const response = await axios.get(url, {
                headers,
                timeout: DISCOVERY_TIMEOUT_MS,
            });
            const modelNames = uniqueModelNames((response.data?.data ?? [])
                .map(model => model.id ?? '')
                .filter((model) => model.length > 0));
            if (modelNames.length > 0) {
                return modelNames;
            }
        }
        catch {
            logForDebugging(`[ModelDiscovery] Failed to fetch OpenAI models from ${url}`);
        }
    }
    return [];
}
async function fetchOllamaModels(url, headers) {
    try {
        const response = await axios.get(url, {
            headers,
            timeout: DISCOVERY_TIMEOUT_MS,
        });
        return uniqueModelNames((response.data?.models ?? [])
            .map(model => model.name ?? '')
            .filter((model) => model.length > 0));
    }
    catch {
        logForDebugging(`[ModelDiscovery] Failed to fetch Ollama models from ${url}`);
        return [];
    }
}
export async function discoverOpenAICompatibleModelOptions() {
    if (getAPIProvider() !== 'openai') {
        return [];
    }
    const baseUrl = getNormalizedOpenAIBaseUrl();
    const headers = getOpenAIAuthHeaders(baseUrl);
    let discoveredModelNames = await fetchOpenAIModels(getModelListUrls(baseUrl), headers);
    if (discoveredModelNames.length === 0) {
        const ollamaTagsUrl = getOllamaTagsUrl(baseUrl);
        if (ollamaTagsUrl) {
            discoveredModelNames = await fetchOllamaModels(ollamaTagsUrl, headers);
        }
    }
    return discoveredModelNames.map(modelName => ({
        value: modelName,
        label: modelName,
        description: DISCOVERED_MODEL_DESCRIPTION,
    }));
}
//# sourceMappingURL=openaiModelDiscovery.js.map