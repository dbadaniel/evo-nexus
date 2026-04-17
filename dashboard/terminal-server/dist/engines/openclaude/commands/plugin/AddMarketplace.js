import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { logEvent } from 'src/services/analytics/index.js';
import { ConfigurableShortcutHint } from '../../components/ConfigurableShortcutHint.js';
import { Byline } from '../../components/design-system/Byline.js';
import { KeyboardShortcutHint } from '../../components/design-system/KeyboardShortcutHint.js';
import { Spinner } from '../../components/Spinner.js';
import TextInput from '../../components/TextInput.js';
import { Box, Text } from '../../ink.js';
import { toError } from '../../utils/errors.js';
import { logError } from '../../utils/log.js';
import { clearAllCaches } from '../../utils/plugins/cacheUtils.js';
import { addMarketplaceSource, saveMarketplaceToSettings } from '../../utils/plugins/marketplaceManager.js';
import { parseMarketplaceInput } from '../../utils/plugins/parseMarketplaceInput.js';
export function AddMarketplace({ inputValue, setInputValue, cursorOffset, setCursorOffset, error, setError, result, setResult, setViewState, onAddComplete, cliMode = false }) {
    const hasAttemptedAutoAdd = useRef(false);
    const [isLoading, setLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const handleAdd = async () => {
        const input = inputValue.trim();
        if (!input) {
            setError('Please enter a marketplace source');
            return;
        }
        const parsed = await parseMarketplaceInput(input);
        if (!parsed) {
            setError('Invalid marketplace source format. Try: owner/repo, https://..., or ./path');
            return;
        }
        // Check if parseMarketplaceInput returned an error
        if ('error' in parsed) {
            setError(parsed.error);
            return;
        }
        setError(null);
        try {
            setLoading(true);
            setProgressMessage('');
            const { name, resolvedSource } = await addMarketplaceSource(parsed, message => {
                setProgressMessage(message);
            });
            saveMarketplaceToSettings(name, {
                source: resolvedSource
            });
            clearAllCaches();
            let sourceType = parsed.source;
            if (parsed.source === 'github') {
                sourceType = parsed.repo;
            }
            logEvent('tengu_marketplace_added', {
                source_type: sourceType
            });
            if (onAddComplete) {
                await onAddComplete();
            }
            setProgressMessage('');
            setLoading(false);
            if (cliMode) {
                // In CLI mode, set result to trigger completion
                setResult(`Successfully added marketplace: ${name}`);
            }
            else {
                // In interactive mode, switch to browse view
                setViewState({
                    type: 'browse-marketplace',
                    targetMarketplace: name
                });
            }
        }
        catch (err) {
            const error = toError(err);
            logError(error);
            setError(error.message);
            setProgressMessage('');
            setLoading(false);
            if (cliMode) {
                // In CLI mode, set result with error to trigger completion
                setResult(`Error: ${error.message}`);
            }
            else {
                setResult(null);
            }
        }
    };
    // Auto-add if inputValue is provided
    useEffect(() => {
        if (inputValue && !hasAttemptedAutoAdd.current && !error && !result) {
            hasAttemptedAutoAdd.current = true;
            void handleAdd();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    }, []); // Only run once on mount
    return React.createElement(Box, { flexDirection: "column" },
        React.createElement(Box, { flexDirection: "column", paddingX: 1, borderStyle: "round" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { bold: true }, "Add Marketplace")),
            React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, null, "Enter marketplace source:"),
                React.createElement(Text, { dimColor: true }, "Examples:"),
                React.createElement(Text, { dimColor: true }, " \u00B7 owner/repo (GitHub)"),
                React.createElement(Text, { dimColor: true }, " \u00B7 git@github.com:owner/repo.git (SSH)"),
                React.createElement(Text, { dimColor: true }, " \u00B7 https://example.com/marketplace.json"),
                React.createElement(Text, { dimColor: true }, " \u00B7 ./path/to/marketplace"),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleAdd, columns: 80, cursorOffset: cursorOffset, onChangeCursorOffset: setCursorOffset, focus: true, showCursor: true }))),
            isLoading && React.createElement(Box, { marginTop: 1 },
                React.createElement(Spinner, null),
                React.createElement(Text, null, progressMessage || 'Adding marketplace to configuration…')),
            error && React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "error" }, error)),
            result && React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, null, result))),
        React.createElement(Box, { marginLeft: 3 },
            React.createElement(Text, { dimColor: true, italic: true },
                React.createElement(Byline, null,
                    React.createElement(KeyboardShortcutHint, { shortcut: "Enter", action: "add" }),
                    React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Settings", fallback: "Esc", description: "cancel" })))));
}
//# sourceMappingURL=AddMarketplace.js.map