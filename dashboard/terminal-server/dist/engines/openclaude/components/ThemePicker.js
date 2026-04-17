import { feature } from 'bun:bundle';
import * as React from 'react';
import { useExitOnCtrlCDWithKeybindings } from '../hooks/useExitOnCtrlCDWithKeybindings.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { Box, Text, usePreviewTheme, useTheme, useThemeSetting } from '../ink.js';
import { useRegisterKeybindingContext } from '../keybindings/KeybindingContext.js';
import { useKeybinding } from '../keybindings/useKeybinding.js';
import { useShortcutDisplay } from '../keybindings/useShortcutDisplay.js';
import { useAppState, useSetAppState } from '../state/AppState.js';
import { gracefulShutdown } from '../utils/gracefulShutdown.js';
import { updateSettingsForSource } from '../utils/settings/settings.js';
import { Select } from './CustomSelect/index.js';
import { Byline } from './design-system/Byline.js';
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js';
import { getColorModuleUnavailableReason, getSyntaxTheme } from './StructuredDiff/colorDiff.js';
import { StructuredDiff } from './StructuredDiff.js';
const StructuredDiffView = StructuredDiff;
const DEMO_PATCH = {
    oldStart: 1,
    newStart: 1,
    oldLines: 3,
    newLines: 3,
    lines: [
        ' function greet() {',
        '-  console.log("Hello, World!");',
        '+  console.log("Hello, Claude!");',
        ' }',
    ],
};
/**
 * Theme chooser with live preview. Implemented without react-compiler `_c` memo
 * caches so preview/subtree reconciliation cannot stick on stale element refs when
 * `setPreviewTheme` updates the resolved palette.
 */
export function ThemePicker({ onThemeSelect, showIntroText = false, helpText = '', showHelpTextBelow = false, hideEscToCancel = false, skipExitHandling = false, onCancel: onCancelProp, }) {
    const [theme] = useTheme();
    const themeSetting = useThemeSetting();
    const { columns } = useTerminalSize();
    const colorModuleUnavailableReason = React.useMemo(() => getColorModuleUnavailableReason(), []);
    const syntaxTheme = colorModuleUnavailableReason === null ? getSyntaxTheme(theme) : null;
    const { setPreviewTheme, savePreview, cancelPreview } = usePreviewTheme();
    const syntaxHighlightingDisabled = useAppState((s) => s.settings.syntaxHighlightingDisabled ?? false);
    const setAppState = useSetAppState();
    useRegisterKeybindingContext("ThemePicker", true);
    const syntaxToggleShortcut = useShortcutDisplay("theme:toggleSyntaxHighlighting", "ThemePicker", "ctrl+t");
    const toggleSyntax = React.useCallback(() => {
        if (colorModuleUnavailableReason === null) {
            const newValue = !syntaxHighlightingDisabled;
            updateSettingsForSource("userSettings", {
                syntaxHighlightingDisabled: newValue
            });
            setAppState(prev => ({
                ...prev,
                settings: {
                    ...prev.settings,
                    syntaxHighlightingDisabled: newValue
                }
            }));
        }
    }, [
        colorModuleUnavailableReason,
        syntaxHighlightingDisabled,
        setAppState,
    ]);
    useKeybinding("theme:toggleSyntaxHighlighting", toggleSyntax, {
        context: "ThemePicker",
    });
    const exitState = useExitOnCtrlCDWithKeybindings(skipExitHandling ? () => { } : undefined);
    const themeOptions = React.useMemo(() => [
        ...(feature("AUTO_THEME")
            ? [{ label: "Auto (match terminal)", value: "auto" }]
            : []), {
            label: "Dark mode",
            value: "dark"
        }, {
            label: "Light mode",
            value: "light"
        }, {
            label: "Dark mode (colorblind-friendly)",
            value: "dark-daltonized",
        }, {
            label: "Light mode (colorblind-friendly)",
            value: "light-daltonized",
        }, {
            label: "Dark mode (ANSI colors only)",
            value: "dark-ansi"
        }, {
            label: "Light mode (ANSI colors only)",
            value: "light-ansi"
        },
    ], []);
    const handleRowFocus = React.useCallback((setting) => {
        setPreviewTheme(setting);
    }, [setPreviewTheme]);
    const handleSelect = React.useCallback((setting) => {
        savePreview();
        onThemeSelect(setting);
    }, [savePreview, onThemeSelect]);
    const handleCancel = React.useCallback(() => {
        cancelPreview();
        if (skipExitHandling) {
            onCancelProp?.();
        }
        else {
            void gracefulShutdown(0);
        }
    }, [cancelPreview, onCancelProp, skipExitHandling]);
    const syntaxHint = colorModuleUnavailableReason === 'env'
        ? `Syntax highlighting disabled (via CLAUDE_CODE_SYNTAX_HIGHLIGHT=${process.env.CLAUDE_CODE_SYNTAX_HIGHLIGHT})`
        : syntaxHighlightingDisabled
            ? `Syntax highlighting disabled (${syntaxToggleShortcut} to enable)`
            : syntaxTheme
                ? `Syntax theme: ${syntaxTheme.theme}${syntaxTheme.source ? ` (from ${syntaxTheme.source})` : ''} (${syntaxToggleShortcut} to disable)`
                : `Syntax highlighting enabled (${syntaxToggleShortcut} to disable)`;
    const header = showIntroText ? (React.createElement(Text, null, "Let's get started.")) : (React.createElement(Text, { bold: true, color: "permission" }, "Theme"));
    const introBlock = (React.createElement(Box, { flexDirection: "column" },
        React.createElement(Text, { bold: true }, "Choose the text style that looks best with your terminal"),
        helpText && !showHelpTextBelow ? (React.createElement(Text, { dimColor: true }, helpText)) : null));
    const content = (React.createElement(Box, { flexDirection: "column", gap: 1 },
        React.createElement(Box, { flexDirection: "column", gap: 1 },
            header,
            introBlock,
            React.createElement(Select, { options: themeOptions, onFocus: handleRowFocus, onChange: handleSelect, onCancel: handleCancel, visibleOptionCount: themeOptions.length, defaultValue: themeSetting, defaultFocusValue: themeSetting })),
        React.createElement(Box, { flexDirection: "column", width: "100%" },
            React.createElement(Box, { key: theme, flexDirection: "column", borderTop: true, borderBottom: true, borderLeft: false, borderRight: false, borderStyle: "dashed", borderColor: "subtle" },
                React.createElement(StructuredDiffView, { patch: DEMO_PATCH, dim: false, filePath: "demo.js", firstLine: null, width: columns })),
            React.createElement(Text, { dimColor: true },
                ' ',
                syntaxHint))));
    if (!showIntroText) {
        return (React.createElement(React.Fragment, null,
            React.createElement(Box, { flexDirection: "column" }, content),
            showHelpTextBelow && helpText ? (React.createElement(Box, { marginLeft: 3 },
                React.createElement(Text, { dimColor: true }, helpText))) : null,
            !hideEscToCancel ? (React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true, italic: true }, exitState.pending ? (React.createElement(React.Fragment, null,
                    "Press ",
                    exitState.keyName,
                    " again to exit")) : (React.createElement(Byline, null,
                    React.createElement(KeyboardShortcutHint, { shortcut: "Enter", action: "select" }),
                    React.createElement(KeyboardShortcutHint, { shortcut: "Esc", action: "cancel" })))))) : null));
    }
    return content;
}
//# sourceMappingURL=ThemePicker.js.map