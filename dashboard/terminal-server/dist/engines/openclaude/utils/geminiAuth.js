import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { memoizeWithTTLAsync } from './memoize.js';
const GEMINI_ADC_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const GEMINI_ADC_CACHE_TTL_MS = 5 * 60 * 1000;
function sanitizeCredential(value) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}
export function getGeminiProjectIdHint(env = process.env) {
    return (sanitizeCredential(env.GOOGLE_CLOUD_PROJECT) ??
        sanitizeCredential(env.GCLOUD_PROJECT) ??
        sanitizeCredential(env.GOOGLE_PROJECT_ID));
}
export function getGeminiAuthMode(env = process.env) {
    const normalized = sanitizeCredential(env.GEMINI_AUTH_MODE)?.toLowerCase();
    if (normalized === 'api-key' ||
        normalized === 'access-token' ||
        normalized === 'adc') {
        return normalized;
    }
    return undefined;
}
export function getGeminiAdcCredentialPaths(env = process.env) {
    const explicit = sanitizeCredential(env.GOOGLE_APPLICATION_CREDENTIALS);
    const paths = new Set();
    if (explicit) {
        paths.add(explicit);
    }
    paths.add(join(homedir(), '.config', 'gcloud', 'application_default_credentials.json'));
    const appData = sanitizeCredential(env.APPDATA);
    if (appData) {
        paths.add(join(appData, 'gcloud', 'application_default_credentials.json'));
    }
    return [...paths];
}
export function mayHaveGeminiAdcCredentials(env = process.env) {
    return getGeminiAdcCredentialPaths(env).some(path => existsSync(path));
}
function normalizeAccessToken(value) {
    if (typeof value === 'string') {
        return sanitizeCredential(value);
    }
    return sanitizeCredential(value?.token);
}
async function createDefaultGoogleAuth() {
    const { GoogleAuth } = await import('google-auth-library');
    return new GoogleAuth({
        scopes: [GEMINI_ADC_SCOPE],
    });
}
async function resolveGeminiAdcCredentialUncached(env, deps) {
    if (!mayHaveGeminiAdcCredentials(env)) {
        return { kind: 'none' };
    }
    try {
        const auth = await (deps.createGoogleAuth ?? createDefaultGoogleAuth)();
        const client = await auth.getClient();
        const accessToken = normalizeAccessToken(await client.getAccessToken());
        if (!accessToken) {
            return { kind: 'none' };
        }
        const hintedProjectId = getGeminiProjectIdHint(env);
        const resolvedProjectId = hintedProjectId ??
            (typeof auth.getProjectId === 'function'
                ? sanitizeCredential(await auth.getProjectId().catch(() => undefined))
                : undefined);
        return {
            kind: 'adc',
            credential: accessToken,
            ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
        };
    }
    catch {
        return { kind: 'none' };
    }
}
const resolveDefaultGeminiAdcCredential = memoizeWithTTLAsync(async (googleApplicationCredentials, appData, home, projectIdHint) => resolveGeminiAdcCredentialUncached({
    GOOGLE_APPLICATION_CREDENTIALS: googleApplicationCredentials,
    APPDATA: appData,
    GOOGLE_CLOUD_PROJECT: projectIdHint,
    GCLOUD_PROJECT: projectIdHint,
    GOOGLE_PROJECT_ID: projectIdHint,
    HOME: home,
}, {}), GEMINI_ADC_CACHE_TTL_MS);
export async function resolveGeminiCredential(env = process.env, deps = {}) {
    const authMode = getGeminiAuthMode(env);
    const apiKey = authMode === 'access-token' || authMode === 'adc'
        ? undefined
        : sanitizeCredential(env.GEMINI_API_KEY) ??
            sanitizeCredential(env.GOOGLE_API_KEY);
    if (apiKey && (authMode === undefined || authMode === 'api-key')) {
        return {
            kind: 'api-key',
            credential: apiKey,
        };
    }
    const accessToken = authMode === 'api-key' || authMode === 'adc'
        ? undefined
        : sanitizeCredential(env.GEMINI_ACCESS_TOKEN);
    if (accessToken && (authMode === undefined || authMode === 'access-token')) {
        const projectId = getGeminiProjectIdHint(env);
        return {
            kind: 'access-token',
            credential: accessToken,
            ...(projectId ? { projectId } : {}),
        };
    }
    if (authMode === 'api-key' || authMode === 'access-token') {
        return { kind: 'none' };
    }
    if (deps.createGoogleAuth) {
        return resolveGeminiAdcCredentialUncached(env, deps);
    }
    return resolveDefaultGeminiAdcCredential(sanitizeCredential(env.GOOGLE_APPLICATION_CREDENTIALS), sanitizeCredential(env.APPDATA), homedir(), getGeminiProjectIdHint(env));
}
//# sourceMappingURL=geminiAuth.js.map