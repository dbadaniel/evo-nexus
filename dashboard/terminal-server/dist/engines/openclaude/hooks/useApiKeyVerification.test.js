import { PassThrough } from 'node:stream';
import { afterEach, expect, mock, test } from 'bun:test';
import React from 'react';
import { createRoot, Text } from '../ink.js';
function createTestStreams() {
    const stdout = new PassThrough();
    const stdin = new PassThrough();
    stdin.isTTY = true;
    stdin.setRawMode = () => { };
    stdin.ref = () => { };
    stdin.unref = () => { };
    stdout.columns = 120;
    return { stdout, stdin };
}
async function waitForCondition(predicate, timeoutMs = 2000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (predicate()) {
            return;
        }
        await Bun.sleep(10);
    }
    throw new Error('Timed out waiting for useApiKeyVerification test state');
}
afterEach(() => {
    mock.restore();
});
test('useApiKeyVerification resets stale missing status when the session switches to a third-party provider', async () => {
    const authState = {
        anthropicAuthEnabled: true,
        claudeSubscriber: false,
    };
    const seenStatuses = [];
    mock.module('../utils/auth.js', () => ({
        getAnthropicApiKeyWithSource: () => ({
            key: authState.key,
            source: authState.source,
        }),
        getApiKeyFromApiKeyHelper: async () => undefined,
        isAnthropicAuthEnabled: () => authState.anthropicAuthEnabled,
        isClaudeAISubscriber: () => authState.claudeSubscriber,
    }));
    mock.module('../bootstrap/state.js', () => ({
        getIsNonInteractiveSession: () => false,
    }));
    mock.module('../services/api/claude.js', () => ({
        verifyApiKey: async () => true,
    }));
    // @ts-expect-error cache-busting query string for Bun module mocks
    const { useApiKeyVerification } = await import('./useApiKeyVerification.ts?switch-to-third-party');
    function Harness() {
        const { status } = useApiKeyVerification();
        React.useEffect(() => {
            seenStatuses.push(status);
        }, [status]);
        return React.createElement(Text, null, status);
    }
    const { stdout, stdin } = createTestStreams();
    const root = await createRoot({
        stdout: stdout,
        stdin: stdin,
        patchConsole: false,
    });
    root.render(React.createElement(Harness, null));
    await waitForCondition(() => seenStatuses.includes('missing'));
    authState.anthropicAuthEnabled = false;
    root.render(React.createElement(Harness, null));
    await waitForCondition(() => seenStatuses.includes('valid'));
    root.unmount();
    stdin.end();
    stdout.end();
    await Bun.sleep(0);
    expect(seenStatuses[0]).toBe('missing');
    expect(seenStatuses).toContain('valid');
});
//# sourceMappingURL=useApiKeyVerification.test.js.map