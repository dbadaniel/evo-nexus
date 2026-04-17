/**
 * GitHub OAuth device flow for CLI login (https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow).
 * Uses GitHub Copilot's official OAuth app for device authentication.
 */
import { execFileNoThrow } from '../../utils/execFileNoThrow.js';
export const DEFAULT_GITHUB_DEVICE_FLOW_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
export const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const GITHUB_DEVICE_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const COPILOT_TOKEN_URL = 'https://api.github.com/copilot_internal/v2/token';
/** Only read:user scope — required for Copilot OAuth */
export const DEFAULT_GITHUB_DEVICE_SCOPE = 'read:user';
export const COPILOT_HEADERS = {
    'User-Agent': 'GitHubCopilotChat/0.26.7',
    'Editor-Version': 'vscode/1.99.3',
    'Editor-Plugin-Version': 'copilot-chat/0.26.7',
    'Copilot-Integration-Id': 'vscode-chat',
};
export class GitHubDeviceFlowError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GitHubDeviceFlowError';
    }
}
export function getGithubDeviceFlowClientId() {
    return (process.env.GITHUB_DEVICE_FLOW_CLIENT_ID?.trim() ||
        DEFAULT_GITHUB_DEVICE_FLOW_CLIENT_ID);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function requestDeviceCode(options) {
    const clientId = options?.clientId ?? getGithubDeviceFlowClientId();
    if (!clientId) {
        throw new GitHubDeviceFlowError('No OAuth client ID: set GITHUB_DEVICE_FLOW_CLIENT_ID.');
    }
    const fetchFn = options?.fetchImpl ?? fetch;
    const requestedScope = options?.scope?.trim() || DEFAULT_GITHUB_DEVICE_SCOPE;
    const scopesToTry = requestedScope === DEFAULT_GITHUB_DEVICE_SCOPE
        ? [requestedScope]
        : [requestedScope, DEFAULT_GITHUB_DEVICE_SCOPE];
    let lastError = 'Device code request failed.';
    for (const scope of scopesToTry) {
        const res = await fetchFn(GITHUB_DEVICE_CODE_URL, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new URLSearchParams({
                client_id: clientId,
                scope,
            }),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            lastError = `Device code request failed: ${res.status} ${text}`;
            const isInvalidScope = /invalid_scope/i.test(text);
            const canRetryWithFallback = scope !== DEFAULT_GITHUB_DEVICE_SCOPE && isInvalidScope;
            if (canRetryWithFallback) {
                continue;
            }
            throw new GitHubDeviceFlowError(lastError);
        }
        const data = (await res.json());
        const device_code = data.device_code;
        const user_code = data.user_code;
        const verification_uri = data.verification_uri;
        if (typeof device_code !== 'string' ||
            typeof user_code !== 'string' ||
            typeof verification_uri !== 'string') {
            throw new GitHubDeviceFlowError('Malformed device code response from GitHub');
        }
        return {
            device_code,
            user_code,
            verification_uri,
            expires_in: typeof data.expires_in === 'number' ? data.expires_in : 900,
            interval: typeof data.interval === 'number' ? data.interval : 5,
        };
    }
    throw new GitHubDeviceFlowError(lastError);
}
export async function pollAccessToken(deviceCode, options) {
    const clientId = options?.clientId ?? getGithubDeviceFlowClientId();
    if (!clientId) {
        throw new GitHubDeviceFlowError('client_id required for polling');
    }
    let interval = Math.max(1, options?.initialInterval ?? 5);
    const timeoutSeconds = options?.timeoutSeconds ?? 900;
    const fetchFn = options?.fetchImpl ?? fetch;
    const start = Date.now();
    while ((Date.now() - start) / 1000 < timeoutSeconds) {
        const res = await fetchFn(GITHUB_DEVICE_ACCESS_TOKEN_URL, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new URLSearchParams({
                client_id: clientId,
                device_code: deviceCode,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new GitHubDeviceFlowError(`Token request failed: ${res.status} ${text}`);
        }
        const data = (await res.json());
        const err = data.error;
        if (err == null) {
            const token = data.access_token;
            if (typeof token === 'string' && token) {
                return token;
            }
            throw new GitHubDeviceFlowError('No access_token in response');
        }
        if (err === 'authorization_pending') {
            await sleep(interval * 1000);
            continue;
        }
        if (err === 'slow_down') {
            interval =
                typeof data.interval === 'number' ? data.interval : interval + 5;
            await sleep(interval * 1000);
            continue;
        }
        if (err === 'expired_token') {
            throw new GitHubDeviceFlowError('Device code expired. Start the login flow again.');
        }
        if (err === 'access_denied') {
            throw new GitHubDeviceFlowError('Authorization was denied or cancelled.');
        }
        throw new GitHubDeviceFlowError(`GitHub OAuth error: ${err}`);
    }
    throw new GitHubDeviceFlowError('Timed out waiting for authorization.');
}
/**
 * Best-effort open browser / OS handler for the verification URL.
 */
export async function openVerificationUri(uri) {
    try {
        if (process.platform === 'darwin') {
            await execFileNoThrow('open', [uri], { useCwd: false, timeout: 5000 });
        }
        else if (process.platform === 'win32') {
            await execFileNoThrow('cmd', ['/c', 'start', '', uri], {
                useCwd: false,
                timeout: 5000,
            });
        }
        else {
            await execFileNoThrow('xdg-open', [uri], { useCwd: false, timeout: 5000 });
        }
    }
    catch {
        // User can open the URL manually
    }
}
/**
 * Exchange an OAuth access token for a Copilot API token.
 * The OAuth token alone cannot be used with the Copilot API endpoint.
 */
export async function exchangeForCopilotToken(oauthToken, fetchImpl) {
    const fetchFn = fetchImpl ?? fetch;
    const res = await fetchFn(COPILOT_TOKEN_URL, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${oauthToken}`,
            ...COPILOT_HEADERS,
        },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new GitHubDeviceFlowError(`Copilot token exchange failed: ${res.status} ${text}`);
    }
    const data = (await res.json());
    const token = data.token;
    const expires_at = data.expires_at;
    const refresh_in = data.refresh_in;
    const endpoints = data.endpoints;
    if (typeof token !== 'string' ||
        typeof expires_at !== 'number' ||
        typeof refresh_in !== 'number' ||
        !endpoints ||
        typeof endpoints !== 'object' ||
        typeof endpoints.api !== 'string') {
        throw new GitHubDeviceFlowError('Malformed Copilot token response');
    }
    return {
        token,
        expires_at,
        refresh_in,
        endpoints: endpoints,
    };
}
//# sourceMappingURL=deviceFlow.js.map