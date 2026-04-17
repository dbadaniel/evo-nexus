import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { Box, Text } from '../../ink.js';
import { useKeybinding } from '../../keybindings/useKeybinding.js';
import { buildCodexUsageRows, fetchCodexUsage, formatCodexPlanType, } from '../../services/api/codexUsage.js';
import { formatResetText } from '../../utils/format.js';
import { logError } from '../../utils/log.js';
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js';
import { Byline } from '../design-system/Byline.js';
import { ProgressBar } from '../design-system/ProgressBar.js';
function CodexUsageLimitBar({ label, usedPercent, resetsAt, maxWidth, }) {
    const normalizedUsedPercent = Math.max(0, Math.min(100, usedPercent));
    const usedText = `${Math.floor(normalizedUsedPercent)}% used`;
    const resetText = resetsAt
        ? `Resets ${formatResetText(resetsAt, true, true)}`
        : undefined;
    if (maxWidth >= 62) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { bold: true }, label),
            React.createElement(Box, { flexDirection: "row", gap: 1 },
                React.createElement(ProgressBar, { ratio: normalizedUsedPercent / 100, width: 50, fillColor: "rate_limit_fill", emptyColor: "rate_limit_empty" }),
                React.createElement(Text, null, usedText)),
            resetText ? React.createElement(Text, { dimColor: true }, resetText) : null));
    }
    return (React.createElement(Box, { flexDirection: "column" },
        React.createElement(Text, null,
            React.createElement(Text, { bold: true }, label),
            resetText ? (React.createElement(React.Fragment, null,
                React.createElement(Text, null, " "),
                React.createElement(Text, { dimColor: true },
                    "\u00B7 ",
                    resetText))) : null),
        React.createElement(ProgressBar, { ratio: normalizedUsedPercent / 100, width: maxWidth, fillColor: "rate_limit_fill", emptyColor: "rate_limit_empty" }),
        React.createElement(Text, null, usedText)));
}
function CodexUsageTextRow({ label, value, }) {
    if (!value) {
        return React.createElement(Text, { bold: true }, label);
    }
    return (React.createElement(Text, null,
        React.createElement(Text, { bold: true }, label),
        React.createElement(Text, { dimColor: true },
            " \u00B7 ",
            value)));
}
export function CodexUsage() {
    const [usage, setUsage] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { columns } = useTerminalSize();
    const availableWidth = columns - 2;
    const maxWidth = Math.min(availableWidth, 80);
    const loadUsage = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            setUsage(await fetchCodexUsage());
        }
        catch (err) {
            logError(err);
            setError(err instanceof Error ? err.message : 'Failed to load Codex usage');
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        void loadUsage();
    }, [loadUsage]);
    useKeybinding('settings:retry', () => {
        void loadUsage();
    }, {
        context: 'Settings',
        isActive: !!error && !isLoading,
    });
    if (error) {
        return (React.createElement(Box, { flexDirection: "column", gap: 1 },
            React.createElement(Text, { color: "error" },
                "Error: ",
                error),
            React.createElement(Text, { dimColor: true },
                React.createElement(Byline, null,
                    React.createElement(ConfigurableShortcutHint, { action: "settings:retry", context: "Settings", fallback: "r", description: "retry" }),
                    React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Settings", fallback: "Esc", description: "cancel" })))));
    }
    if (!usage) {
        return (React.createElement(Box, { flexDirection: "column", gap: 1 },
            React.createElement(Text, { dimColor: true }, "Loading Codex usage data\u2026"),
            React.createElement(Text, { dimColor: true },
                React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Settings", fallback: "Esc", description: "cancel" }))));
    }
    const rows = buildCodexUsageRows(usage.snapshots);
    const planType = formatCodexPlanType(usage.planType);
    return (React.createElement(Box, { flexDirection: "column", gap: 1, width: "100%" },
        planType ? React.createElement(Text, { dimColor: true },
            "Plan: ",
            planType) : null,
        rows.length === 0 ? (React.createElement(Text, { dimColor: true }, "Codex usage data is not available for this account.")) : null,
        rows.map((row, index) => row.kind === 'window' ? (React.createElement(CodexUsageLimitBar, { key: `${row.label}-${index}`, label: row.label, usedPercent: row.usedPercent, resetsAt: row.resetsAt, maxWidth: maxWidth })) : (React.createElement(CodexUsageTextRow, { key: `${row.label}-${index}`, label: row.label, value: row.value }))),
        React.createElement(Text, { dimColor: true },
            React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Settings", fallback: "Esc", description: "cancel" }))));
}
//# sourceMappingURL=CodexUsage.js.map