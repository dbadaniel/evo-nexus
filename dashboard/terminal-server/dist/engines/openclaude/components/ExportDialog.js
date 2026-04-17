import { join } from 'path';
import React, { useCallback, useState } from 'react';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { setClipboard } from '../ink/termio/osc.js';
import { Box, Text } from '../ink.js';
import { useKeybinding } from '../keybindings/useKeybinding.js';
import { getCwd } from '../utils/cwd.js';
import { writeFileSync_DEPRECATED } from '../utils/slowOperations.js';
import { ConfigurableShortcutHint } from './ConfigurableShortcutHint.js';
import { Select } from './CustomSelect/select.js';
import { Byline } from './design-system/Byline.js';
import { Dialog } from './design-system/Dialog.js';
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js';
import TextInput from './TextInput.js';
export function ExportDialog({ content, defaultFilename, onDone }) {
    const [, setSelectedOption] = useState(null);
    const [filename, setFilename] = useState(defaultFilename);
    const [cursorOffset, setCursorOffset] = useState(defaultFilename.length);
    const [showFilenameInput, setShowFilenameInput] = useState(false);
    const { columns } = useTerminalSize();
    // Handle going back from filename input to option selection
    const handleGoBack = useCallback(() => {
        setShowFilenameInput(false);
        setSelectedOption(null);
    }, []);
    const handleSelectOption = async (value) => {
        if (value === 'clipboard') {
            // Copy to clipboard immediately
            const raw = await setClipboard(content);
            if (raw)
                process.stdout.write(raw);
            onDone({
                success: true,
                message: 'Conversation copied to clipboard'
            });
        }
        else if (value === 'file') {
            setSelectedOption('file');
            setShowFilenameInput(true);
        }
    };
    const handleFilenameSubmit = () => {
        const finalFilename = filename.endsWith('.txt') ? filename : filename.replace(/\.[^.]+$/, '') + '.txt';
        const filepath = join(getCwd(), finalFilename);
        try {
            writeFileSync_DEPRECATED(filepath, content, {
                encoding: 'utf-8',
                flush: true
            });
            onDone({
                success: true,
                message: `Conversation exported to: ${filepath}`
            });
        }
        catch (error) {
            onDone({
                success: false,
                message: `Failed to export conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    };
    // Dialog calls onCancel when Escape is pressed. If we are in the filename
    // input sub-screen, go back to the option list instead of closing entirely.
    const handleCancel = useCallback(() => {
        if (showFilenameInput) {
            handleGoBack();
        }
        else {
            onDone({
                success: false,
                message: 'Export cancelled'
            });
        }
    }, [showFilenameInput, handleGoBack, onDone]);
    const options = [{
            label: 'Copy to clipboard',
            value: 'clipboard',
            description: 'Copy the conversation to your system clipboard'
        }, {
            label: 'Save to file',
            value: 'file',
            description: 'Save the conversation to a file in the current directory'
        }];
    // Custom input guide that changes based on dialog state
    function renderInputGuide(exitState) {
        if (showFilenameInput) {
            return React.createElement(Byline, null,
                React.createElement(KeyboardShortcutHint, { shortcut: "Enter", action: "save" }),
                React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Confirmation", fallback: "Esc", description: "go back" }));
        }
        if (exitState.pending) {
            return React.createElement(Text, null,
                "Press ",
                exitState.keyName,
                " again to exit");
        }
        return React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Confirmation", fallback: "Esc", description: "cancel" });
    }
    // Use Settings context so 'n' key doesn't cancel (allows typing 'n' in filename input)
    useKeybinding('confirm:no', handleCancel, {
        context: 'Settings',
        isActive: showFilenameInput
    });
    return React.createElement(Dialog, { title: "Export Conversation", subtitle: "Select export method:", color: "permission", onCancel: handleCancel, inputGuide: renderInputGuide, isCancelActive: !showFilenameInput }, !showFilenameInput ? React.createElement(Select, { options: options, onChange: handleSelectOption, onCancel: handleCancel }) : React.createElement(Box, { flexDirection: "column" },
        React.createElement(Text, null, "Enter filename:"),
        React.createElement(Box, { flexDirection: "row", gap: 1, marginTop: 1 },
            React.createElement(Text, null, ">"),
            React.createElement(TextInput, { value: filename, onChange: setFilename, onSubmit: handleFilenameSubmit, focus: true, showCursor: true, columns: columns, cursorOffset: cursorOffset, onChangeCursorOffset: setCursorOffset }))));
}
//# sourceMappingURL=ExportDialog.js.map