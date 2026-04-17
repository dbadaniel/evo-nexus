import { PassThrough } from 'node:stream';
import { afterEach, expect, mock, test } from 'bun:test';
import React from 'react';
import { createRoot, Text } from '../ink.js';
const SYNC_START = '\x1B[?2026h';
const SYNC_END = '\x1B[?2026l';
function createTestStreams() {
    let output = '';
    const stdout = new PassThrough();
    const stdin = new PassThrough();
    stdin.isTTY = true;
    stdin.setRawMode = () => { };
    stdin.ref = () => { };
    stdin.unref = () => { };
    stdout.columns = 120;
    stdout.on('data', chunk => {
        output += chunk.toString();
    });
    return {
        stdout,
        stdin,
        getOutput: () => output,
    };
}
async function waitForCondition(predicate, options) {
    const timeoutMs = options?.timeoutMs ?? 5000;
    const intervalMs = options?.intervalMs ?? 10;
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (predicate()) {
            return;
        }
        await Bun.sleep(intervalMs);
    }
    throw new Error('Timed out waiting for useCodexOAuthFlow test condition');
}
function extractLastFrame(output) {
    let lastFrame = null;
    let cursor = 0;
    while (cursor < output.length) {
        const start = output.indexOf(SYNC_START, cursor);
        if (start === -1)
            break;
        const contentStart = start + SYNC_START.length;
        const end = output.indexOf(SYNC_END, contentStart);
        if (end === -1)
            break;
        const frame = output.slice(contentStart, end);
        if (frame.trim().length > 0) {
            lastFrame = frame;
        }
        cursor = end + SYNC_END.length;
    }
    return lastFrame ?? output;
}
const TOKENS = {
    accessToken: 'oauth-access-token',
    refreshToken: 'oauth-refresh-token',
    accountId: 'acct_oauth',
    idToken: 'oauth-id-token',
    apiKey: 'oauth-api-key',
};
afterEach(() => {
    mock.restore();
});
test('does not persist credentials when downstream setup rejects', async () => {
    const saveCodexCredentials = mock(() => ({ success: true }));
    const cleanup = mock(() => { });
    const onAuthenticated = mock(async () => {
        throw new Error('profile save failed');
    });
    const deps = {
        createOAuthService: () => ({
            async startOAuthFlow(onAuthorizationUrl) {
                await onAuthorizationUrl('https://chatgpt.com/codex');
                return TOKENS;
            },
            cleanup,
        }),
        openBrowser: async () => true,
        saveCodexCredentials,
        isBareMode: () => false,
    };
    const { useCodexOAuthFlow } = await import(`./useCodexOAuthFlow.js?real-reject-${Date.now()}-${Math.random()}`);
    function Harness() {
        const handleAuthenticated = React.useCallback(onAuthenticated, [onAuthenticated]);
        const status = useCodexOAuthFlow({
            onAuthenticated: handleAuthenticated,
            deps,
        });
        return React.createElement(Text, null, status.state === 'error' ? status.message : status.state);
    }
    const streams = createTestStreams();
    const root = await createRoot({
        stdout: streams.stdout,
        stdin: streams.stdin,
        patchConsole: false,
    });
    root.render(React.createElement(Harness, null));
    try {
        await waitForCondition(() => onAuthenticated.mock.calls.length === 1);
        await Bun.sleep(0);
        await Bun.sleep(0);
        expect(onAuthenticated).toHaveBeenCalled();
        expect(saveCodexCredentials).not.toHaveBeenCalled();
    }
    finally {
        root.unmount();
        streams.stdin.end();
        streams.stdout.end();
        await Bun.sleep(0);
    }
});
test('persists credentials with profile linkage after downstream setup succeeds', async () => {
    const saveCodexCredentials = mock(() => ({ success: true }));
    const onAuthenticated = mock(async (_tokens, persistCredentials) => {
        persistCredentials({ profileId: 'profile_codex_oauth' });
    });
    const cleanup = mock(() => { });
    const deps = {
        createOAuthService: () => ({
            async startOAuthFlow(onAuthorizationUrl) {
                await onAuthorizationUrl('https://chatgpt.com/codex');
                return TOKENS;
            },
            cleanup,
        }),
        openBrowser: async () => true,
        saveCodexCredentials,
        isBareMode: () => false,
    };
    const { useCodexOAuthFlow } = await import(`./useCodexOAuthFlow.js?real-persist-${Date.now()}-${Math.random()}`);
    function Harness() {
        const handleAuthenticated = React.useCallback(onAuthenticated, [onAuthenticated]);
        useCodexOAuthFlow({
            onAuthenticated: handleAuthenticated,
            deps,
        });
        return React.createElement(Text, null, "waiting");
    }
    const streams = createTestStreams();
    const root = await createRoot({
        stdout: streams.stdout,
        stdin: streams.stdin,
        patchConsole: false,
    });
    root.render(React.createElement(Harness, null));
    try {
        await waitForCondition(() => onAuthenticated.mock.calls.length === 1);
        await waitForCondition(() => saveCodexCredentials.mock.calls.length === 1);
        expect(onAuthenticated).toHaveBeenCalled();
        expect(saveCodexCredentials).toHaveBeenCalledWith({
            apiKey: TOKENS.apiKey,
            accessToken: TOKENS.accessToken,
            refreshToken: TOKENS.refreshToken,
            idToken: TOKENS.idToken,
            accountId: TOKENS.accountId,
            profileId: 'profile_codex_oauth',
        });
    }
    finally {
        root.unmount();
        streams.stdin.end();
        streams.stdout.end();
        await Bun.sleep(0);
    }
});
//# sourceMappingURL=useCodexOAuthFlow.test.js.map