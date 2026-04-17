import { isBareMode, isEnvTruthy } from './envUtils.js';
import { getGeminiAuthMode } from './geminiAuth.js';
import { getSecureStorage } from './secureStorage/index.js';
export const GEMINI_TOKEN_STORAGE_KEY = 'gemini';
export function readGeminiAccessToken() {
    if (isBareMode())
        return undefined;
    try {
        const data = getSecureStorage().read();
        const token = data?.gemini?.accessToken?.trim();
        return token || undefined;
    }
    catch {
        return undefined;
    }
}
export function hydrateGeminiAccessTokenFromSecureStorage() {
    if (!isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI)) {
        return;
    }
    const authMode = getGeminiAuthMode(process.env);
    if (authMode && authMode !== 'access-token') {
        return;
    }
    if (process.env.GEMINI_ACCESS_TOKEN?.trim()) {
        return;
    }
    if (isBareMode()) {
        return;
    }
    const token = readGeminiAccessToken();
    if (token) {
        process.env.GEMINI_ACCESS_TOKEN = token;
    }
}
export function saveGeminiAccessToken(token) {
    if (isBareMode()) {
        return { success: false, warning: 'Bare mode: secure storage is disabled.' };
    }
    const trimmed = token.trim();
    if (!trimmed) {
        return { success: false, warning: 'Token is empty.' };
    }
    const secureStorage = getSecureStorage();
    const previous = secureStorage.read() || {};
    const next = {
        ...previous,
        [GEMINI_TOKEN_STORAGE_KEY]: { accessToken: trimmed },
    };
    return secureStorage.update(next);
}
export function clearGeminiAccessToken() {
    if (isBareMode()) {
        return { success: true };
    }
    const secureStorage = getSecureStorage();
    const previous = secureStorage.read() || {};
    const next = { ...previous };
    delete next[GEMINI_TOKEN_STORAGE_KEY];
    return secureStorage.update(next);
}
//# sourceMappingURL=geminiCredentials.js.map