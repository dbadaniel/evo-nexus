import * as React from 'react';
import { CodexOAuthService, } from '../services/api/codexOAuth.js';
import { openBrowser } from '../utils/browser.js';
import { saveCodexCredentials } from '../utils/codexCredentials.js';
import { isBareMode } from '../utils/envUtils.js';
function createDefaultOAuthService() {
    return new CodexOAuthService();
}
export function useCodexOAuthFlow(options) {
    const { onAuthenticated } = options;
    const createOAuthService = options.deps?.createOAuthService ?? createDefaultOAuthService;
    const openBrowserFn = options.deps?.openBrowser ?? openBrowser;
    const saveCredentials = options.deps?.saveCodexCredentials ?? saveCodexCredentials;
    const isBareModeFn = options.deps?.isBareMode ?? isBareMode;
    const [status, setStatus] = React.useState({
        state: 'starting',
    });
    React.useEffect(() => {
        if (isBareModeFn()) {
            setStatus({
                state: 'error',
                message: 'Codex OAuth is unavailable in --bare because secure storage is disabled.',
            });
            return;
        }
        let cancelled = false;
        const oauthService = createOAuthService();
        void oauthService
            .startOAuthFlow(async (authUrl) => {
            if (cancelled)
                return;
            setStatus({
                state: 'waiting',
                authUrl,
                browserOpened: null,
            });
            const browserOpened = await openBrowserFn(authUrl);
            if (cancelled)
                return;
            setStatus({
                state: 'waiting',
                authUrl,
                browserOpened,
            });
        })
            .then(async (tokens) => {
            if (cancelled)
                return;
            const persistCredentials = options => {
                const saved = saveCredentials({
                    apiKey: tokens.apiKey,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    idToken: tokens.idToken,
                    accountId: tokens.accountId,
                    profileId: options?.profileId,
                });
                if (!saved.success) {
                    throw new Error(saved.warning ??
                        'Codex OAuth succeeded, but credentials could not be saved securely.');
                }
            };
            await onAuthenticated(tokens, persistCredentials);
        })
            .catch(error => {
            if (cancelled)
                return;
            setStatus({
                state: 'error',
                message: error instanceof Error ? error.message : String(error),
            });
        });
        return () => {
            cancelled = true;
            oauthService.cleanup();
        };
    }, [
        createOAuthService,
        isBareModeFn,
        onAuthenticated,
        openBrowserFn,
        saveCredentials,
    ]);
    return status;
}
//# sourceMappingURL=useCodexOAuthFlow.js.map