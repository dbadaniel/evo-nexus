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
            label: <EffortOptionLabel level="auto" text="Auto" isCurrent={false}/>,
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
                label: (<EffortOptionLabel level={level} text={getEffortLevelLabel(level)} isCurrent={isCurrent}/>),
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
    return (<Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text color="remember" bold={true}>Set effort level</Text>
        <Text dimColor={true}>
            {supportsEffort && usesOpenAIEffort
            ? `OpenAI/Codex provider (${provider})`
            : supportsEffort
                ? `Claude model · ${provider} provider`
                : `Effort not supported for this model`}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Select options={options} defaultValue={initialFocus} onChange={handleSelect} onCancel={handleCancel} visibleOptionCount={Math.min(6, options.length)} inlineDescriptions={true}/>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor={true} italic={true}>
          <Byline>
            <KeyboardShortcutHint shortcut="Enter" action="confirm"/>
            <KeyboardShortcutHint shortcut="Esc" action="cancel"/>
          </Byline>
        </Text>
      </Box>
    </Box>);
}
function EffortOptionLabel({ level, text, isCurrent }) {
    const symbol = level === 'auto' ? '⊘' : effortLevelToSymbol(level);
    const color = isCurrent ? 'remember' : level === 'auto' ? 'subtle' : 'suggestion';
    return (<>
      <Text color={color}>{symbol} </Text>
      <Text bold={isCurrent}>{text}</Text>
      {isCurrent && <Text dimColor={true}> (current)</Text>}
    </>);
}
//# sourceMappingURL=EffortPicker.js.map