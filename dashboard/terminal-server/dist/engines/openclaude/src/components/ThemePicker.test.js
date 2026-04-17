import { PassThrough } from 'node:stream';
import { afterEach, expect, mock, test } from 'bun:test';
import React from 'react';
import stripAnsi from 'strip-ansi';
import { createRoot, Text, useTheme } from '../ink.js';
import { KeybindingSetup } from '../keybindings/KeybindingProviderSetup.js';
import { AppStateProvider } from '../state/AppState.js';
import { ThemeProvider } from './design-system/ThemeProvider.js';
mock.module('./StructuredDiff.js', () => ({
    StructuredDiff: function StructuredDiffPreview() {
        const [theme] = useTheme();
        return <Text>{`Preview theme: ${theme}`}</Text>;
    },
}));
mock.module('./StructuredDiff/colorDiff.js', () => ({
    getColorModuleUnavailableReason: () => 'env',
    getSyntaxTheme: () => null,
}));
const SYNC_START = '\x1B[?2026h';
const SYNC_END = '\x1B[?2026l';
function extractLastFrame(output) {
    let lastFrame = null;
    let cursor = 0;
    while (cursor < output.length) {
        const start = output.indexOf(SYNC_START, cursor);
        if (start === -1) {
            break;
        }
        const contentStart = start + SYNC_START.length;
        const end = output.indexOf(SYNC_END, contentStart);
        if (end === -1) {
            break;
        }
        const frame = output.slice(contentStart, end);
        if (frame.trim().length > 0) {
            lastFrame = frame;
        }
        cursor = end + SYNC_END.length;
    }
    return lastFrame ?? output;
}
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
async function waitForCondition(predicate, timeoutMs = 2000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (predicate()) {
            return;
        }
        await Bun.sleep(10);
    }
    throw new Error('Timed out waiting for ThemePicker test condition');
}
async function waitForFrame(getOutput, predicate) {
    let frame = '';
    await waitForCondition(() => {
        frame = stripAnsi(extractLastFrame(getOutput()));
        return predicate(frame);
    });
    return frame;
}
afterEach(() => {
    mock.restore();
});
test('updates the preview when keyboard focus moves to another theme', async () => {
    const { ThemePicker } = await import('./ThemePicker.js');
    const { stdout, stdin, getOutput } = createTestStreams();
    const root = await createRoot({
        stdout: stdout,
        stdin: stdin,
        patchConsole: false,
    });
    root.render(<AppStateProvider>
      <KeybindingSetup>
        <ThemeProvider initialState="dark">
          <ThemePicker onThemeSelect={() => { }}/>
        </ThemeProvider>
      </KeybindingSetup>
    </AppStateProvider>);
    try {
        const initialFrame = await waitForFrame(getOutput, frame => frame.includes('Preview theme: dark'));
        expect(initialFrame).toContain('Preview theme: dark');
        stdin.write('j');
        const updatedFrame = await waitForFrame(getOutput, frame => frame.includes('Preview theme: light'));
        expect(updatedFrame).toContain('Preview theme: light');
    }
    finally {
        root.unmount();
        stdin.end();
        stdout.end();
        await Bun.sleep(0);
    }
});
//# sourceMappingURL=ThemePicker.test.js.map