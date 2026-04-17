import { PassThrough } from 'node:stream';
import { expect, test } from 'bun:test';
import React from 'react';
import stripAnsi from 'strip-ansi';
import { createRoot } from '../ink.js';
import { AppStateProvider } from '../state/AppState.js';
import TextInput from './TextInput.js';
import VimTextInput from './VimTextInput.js';
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
function DelayedControlledTextInput() {
    const [value, setValue] = React.useState('');
    const [cursorOffset, setCursorOffset] = React.useState(0);
    const valueTimerRef = React.useRef(null);
    const offsetTimerRef = React.useRef(null);
    React.useEffect(() => {
        return () => {
            if (valueTimerRef.current) {
                clearTimeout(valueTimerRef.current);
            }
            if (offsetTimerRef.current) {
                clearTimeout(offsetTimerRef.current);
            }
        };
    }, []);
    return (React.createElement(AppStateProvider, null,
        React.createElement(TextInput, { value: value, onChange: nextValue => {
                if (valueTimerRef.current) {
                    clearTimeout(valueTimerRef.current);
                }
                valueTimerRef.current = setTimeout(() => {
                    setValue(nextValue);
                }, 200);
            }, onSubmit: () => { }, placeholder: "Type here...", columns: 60, cursorOffset: cursorOffset, onChangeCursorOffset: nextOffset => {
                if (offsetTimerRef.current) {
                    clearTimeout(offsetTimerRef.current);
                }
                offsetTimerRef.current = setTimeout(() => {
                    setCursorOffset(nextOffset);
                }, 200);
            }, focus: true, showCursor: true, multiline: true })));
}
function DelayedControlledVimTextInput() {
    const [value, setValue] = React.useState('');
    const [cursorOffset, setCursorOffset] = React.useState(0);
    const valueTimerRef = React.useRef(null);
    const offsetTimerRef = React.useRef(null);
    React.useEffect(() => {
        return () => {
            if (valueTimerRef.current) {
                clearTimeout(valueTimerRef.current);
            }
            if (offsetTimerRef.current) {
                clearTimeout(offsetTimerRef.current);
            }
        };
    }, []);
    return (React.createElement(AppStateProvider, null,
        React.createElement(VimTextInput, { value: value, onChange: nextValue => {
                if (valueTimerRef.current) {
                    clearTimeout(valueTimerRef.current);
                }
                valueTimerRef.current = setTimeout(() => {
                    setValue(nextValue);
                }, 200);
            }, onSubmit: () => { }, placeholder: "Type here...", columns: 60, cursorOffset: cursorOffset, onChangeCursorOffset: nextOffset => {
                if (offsetTimerRef.current) {
                    clearTimeout(offsetTimerRef.current);
                }
                offsetTimerRef.current = setTimeout(() => {
                    setCursorOffset(nextOffset);
                }, 200);
            }, initialMode: "INSERT", focus: true, showCursor: true, multiline: true })));
}
test('TextInput renders typed characters before delayed parent value commits', async () => {
    const { stdout, stdin, getOutput } = createTestStreams();
    const root = await createRoot({
        stdout: stdout,
        stdin: stdin,
        patchConsole: false,
    });
    root.render(React.createElement(DelayedControlledTextInput, null));
    await Bun.sleep(50);
    stdin.write('a');
    await Bun.sleep(25);
    stdin.write('b');
    await Bun.sleep(25);
    const output = stripAnsi(extractLastFrame(getOutput()));
    root.unmount();
    stdin.end();
    stdout.end();
    await Bun.sleep(25);
    expect(output).toContain('ab');
    expect(output).not.toContain('Type here...');
});
test('VimTextInput preserves rapid typed characters before delayed parent value commits', async () => {
    const { stdout, stdin, getOutput } = createTestStreams();
    const root = await createRoot({
        stdout: stdout,
        stdin: stdin,
        patchConsole: false,
    });
    root.render(React.createElement(DelayedControlledVimTextInput, null));
    await Bun.sleep(50);
    stdin.write('a');
    await Bun.sleep(25);
    stdin.write('s');
    await Bun.sleep(25);
    stdin.write('d');
    await Bun.sleep(25);
    stdin.write('f');
    await Bun.sleep(25);
    const output = stripAnsi(extractLastFrame(getOutput()));
    root.unmount();
    stdin.end();
    stdout.end();
    await Bun.sleep(25);
    expect(output).toContain('asdf');
    expect(output).not.toContain('Type here...');
});
//# sourceMappingURL=TextInput.test.js.map