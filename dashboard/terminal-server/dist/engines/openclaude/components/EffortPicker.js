import { Box, Text } from '../ink.js';
import { useMainLoopModel } from '../hooks/useMainLoopModel.js';
import { useAppState, useSetAppState } from '../state/AppState.js';
import { getAvailableEffortLevels, getDisplayedEffortLevel, getEffortLevelDescription, getEffortLevelLabel, modelSupportsEffort, modelUsesOpenAIEffort, } from '../utils/effort.js';
import { getAPIProvider } from '../utils/model/providers.js';
import { getReasoningEffortForModel } from '../services/api/providerConfig.js';
import { Select } from './CustomSelect/select.js';
import { effortLevelToSymbol } from './EffortIndicator.js';
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js';
import { Byline } from './design-system/Byline.js';
export function EffortPicker({ onSelect, onCancel }) {
    const model = useMainLoopModel();
    const appStateEffort = useAppState((s) => s.effortValue);
    const setAppState = useSetAppState();
    const provider = getAPIProvider();
    const usesOpenAIEffort = modelUsesOpenAIEffort(model);
    const availableLevels = getAvailableEffortLevels(model);
    const currentDisplayedLevel = getDisplayedEffortLevel(model, appStateEffort);
    // For OpenAI/Codex, get the model's default reasoning effort
    const modelReasoningEffort = usesOpenAIEffort ? getReasoningEffortForModel(model) : undefined;
    const options = [
        {
            label: React.createElement(EffortOptionLabel, { level: "auto", text: "Auto", isCurrent: false }),
            value: 'auto',
            description: 'Use the default effort level for your model',
            isAvailable: true,
        },
        ...availableLevels.map(level => {
            const displayLevel = usesOpenAIEffort
                ? (level === 'xhigh' ? 'max' : level)
                : level;
            const isCurrent = currentDisplayedLevel === displayLevel;
            return {
                label: (React.createElement(EffortOptionLabel, { level: level, text: getEffortLevelLabel(level), isCurrent: isCurrent })),
                value: level,
                description: getEffortLevelDescription(level),
                isAvailable: true,
            };
        }),
    ];
    function handleSelect(value) {
        if (value === 'auto') {
            setAppState(prev => ({
                ...prev,
                effortValue: undefined,
            }));
            onSelect(undefined);
        }
        else {
            const effortLevel = value;
            setAppState(prev => ({
                ...prev,
                effortValue: effortLevel,
            }));
            onSelect(effortLevel);
        }
    }
    function handleCancel() {
        onCancel?.();
    }
    const supportsEffort = modelSupportsEffort(model);
    // For OpenAI/Codex, use the model's default reasoning effort as initial focus
    // For Claude, use the displayed effort level or 'auto'
    const initialFocus = usesOpenAIEffort
        ? (modelReasoningEffort || 'auto')
        : (appStateEffort ? String(appStateEffort) : 'auto');
    return (React.createElement(Box, { flexDirection: "column" },
        React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
            React.createElement(Text, { color: "remember", bold: true }, "Set effort level"),
            React.createElement(Text, { dimColor: true }, supportsEffort && usesOpenAIEffort
                ? `OpenAI/Codex provider (${provider})`
                : supportsEffort
                    ? `Claude model · ${provider} provider`
                    : `Effort not supported for this model`)),
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Select, { options: options, defaultValue: initialFocus, onChange: handleSelect, onCancel: handleCancel, visibleOptionCount: Math.min(6, options.length), inlineDescriptions: true })),
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { dimColor: true, italic: true },
                React.createElement(Byline, null,
                    React.createElement(KeyboardShortcutHint, { shortcut: "Enter", action: "confirm" }),
                    React.createElement(KeyboardShortcutHint, { shortcut: "Esc", action: "cancel" }))))));
}
function EffortOptionLabel({ level, text, isCurrent }) {
    const symbol = level === 'auto' ? '⊘' : effortLevelToSymbol(level);
    const color = isCurrent ? 'remember' : level === 'auto' ? 'subtle' : 'suggestion';
    return (React.createElement(React.Fragment, null,
        React.createElement(Text, { color: color },
            symbol,
            " "),
        React.createElement(Text, { bold: isCurrent }, text),
        isCurrent && React.createElement(Text, { dimColor: true }, " (current)")));
}
//# sourceMappingURL=EffortPicker.js.map