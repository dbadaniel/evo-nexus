import { feature } from 'bun:bundle';
import * as React from 'react';
import { memo, useMemo, useRef } from 'react';
import { isBridgeEnabled } from '../../bridge/bridgeEnabled.js';
import { getBridgeStatus } from '../../bridge/bridgeStatusUtil.js';
import { useSetPromptOverlay } from '../../context/promptOverlayContext.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { Box, Text } from '../../ink.js';
import { useAppState } from '../../state/AppState.js';
import { isFullscreenEnvEnabled } from '../../utils/fullscreen.js';
import { isUndercover } from '../../utils/undercover.js';
import { CoordinatorTaskPanel, useCoordinatorTaskCount } from '../CoordinatorAgentStatus.js';
import { getLastAssistantMessageId, StatusLine, statusLineShouldDisplay } from '../StatusLine.js';
import { Notifications } from './Notifications.js';
import { PromptInputFooterLeftSide } from './PromptInputFooterLeftSide.js';
import { PromptInputFooterSuggestions } from './PromptInputFooterSuggestions.js';
import { PromptInputHelpMenu } from './PromptInputHelpMenu.js';
function PromptInputFooter({ apiKeyStatus, debug, exitMessage, vimMode, mode, autoUpdaterResult, isAutoUpdating, verbose, onAutoUpdaterResult, onChangeIsUpdating, suggestions, selectedSuggestion, maxColumnWidth, toolPermissionContext, helpOpen, suppressHint: suppressHintFromProps, isLoading, tasksSelected, teamsSelected, bridgeSelected, tmuxSelected, teammateFooterIndex, ideSelection, mcpClients, isPasting = false, isInputWrapped = false, messages, isSearching, historyQuery, setHistoryQuery, historyFailedMatch, onOpenTasksDialog }) {
    const settings = useSettings();
    const { columns, rows } = useTerminalSize();
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const lastAssistantMessageId = useMemo(() => getLastAssistantMessageId(messages), [messages]);
    const isNarrow = columns < 80;
    // In fullscreen the bottom slot is flexShrink:0, so every row here is a row
    // stolen from the ScrollBox. Drop the optional StatusLine first. Non-fullscreen
    // has terminal scrollback to absorb overflow, so we never hide StatusLine there.
    const isFullscreen = isFullscreenEnvEnabled();
    const isShort = isFullscreen && rows < 24;
    // Pill highlights when tasks is the active footer item AND no specific
    // agent row is selected. When coordinatorTaskIndex >= 0 the pointer has
    // moved into CoordinatorTaskPanel, so the pill should un-highlight.
    // coordinatorTaskCount === 0 covers the bash-only case (no agent rows
    // exist, pill is the only selectable item).
    const coordinatorTaskCount = useCoordinatorTaskCount();
    const coordinatorTaskIndex = useAppState(s => s.coordinatorTaskIndex);
    const pillSelected = tasksSelected && (coordinatorTaskCount === 0 || coordinatorTaskIndex < 0);
    // Hide `? for shortcuts` if the user has a custom status line, or during ctrl-r
    const suppressHint = suppressHintFromProps || statusLineShouldDisplay(settings) || isSearching;
    // Fullscreen: portal data to FullscreenLayout — see promptOverlayContext.tsx
    const overlayData = useMemo(() => isFullscreen && suggestions.length ? {
        suggestions,
        selectedSuggestion,
        maxColumnWidth
    } : null, [isFullscreen, suggestions, selectedSuggestion, maxColumnWidth]);
    useSetPromptOverlay(overlayData);
    if (suggestions.length && !isFullscreen) {
        return React.createElement(Box, { paddingX: 2, paddingY: 0 },
            React.createElement(PromptInputFooterSuggestions, { suggestions: suggestions, selectedSuggestion: selectedSuggestion, maxColumnWidth: maxColumnWidth }));
    }
    if (helpOpen) {
        return React.createElement(PromptInputHelpMenu, { dimColor: true, fixedWidth: true, paddingX: 2 });
    }
    return React.createElement(React.Fragment, null,
        React.createElement(Box, { flexDirection: isNarrow ? 'column' : 'row', justifyContent: isNarrow ? 'flex-start' : 'space-between', paddingX: 2, gap: isNarrow ? 0 : 1 },
            React.createElement(Box, { flexDirection: "column", flexShrink: isNarrow ? 0 : 1 },
                mode === 'prompt' && !isShort && !exitMessage.show && !isPasting && statusLineShouldDisplay(settings) && React.createElement(StatusLine, { messagesRef: messagesRef, lastAssistantMessageId: lastAssistantMessageId, vimMode: vimMode }),
                React.createElement(PromptInputFooterLeftSide, { exitMessage: exitMessage, vimMode: vimMode, mode: mode, toolPermissionContext: toolPermissionContext, suppressHint: suppressHint, isLoading: isLoading, tasksSelected: pillSelected, teamsSelected: teamsSelected, teammateFooterIndex: teammateFooterIndex, tmuxSelected: tmuxSelected, isPasting: isPasting, isSearching: isSearching, historyQuery: historyQuery, setHistoryQuery: setHistoryQuery, historyFailedMatch: historyFailedMatch, onOpenTasksDialog: onOpenTasksDialog })),
            React.createElement(Box, { flexShrink: 1, gap: 1 },
                isFullscreen ? null : React.createElement(Notifications, { apiKeyStatus: apiKeyStatus, autoUpdaterResult: autoUpdaterResult, debug: debug, isAutoUpdating: isAutoUpdating, verbose: verbose, messages: messages, onAutoUpdaterResult: onAutoUpdaterResult, onChangeIsUpdating: onChangeIsUpdating, ideSelection: ideSelection, mcpClients: mcpClients, isInputWrapped: isInputWrapped, isNarrow: isNarrow }),
                "external" === 'ant' && isUndercover() && React.createElement(Text, { dimColor: true }, "undercover"),
                React.createElement(BridgeStatusIndicator, { bridgeSelected: bridgeSelected }))),
        "external" === 'ant' && React.createElement(CoordinatorTaskPanel, null));
}
export default memo(PromptInputFooter);
function BridgeStatusIndicator({ bridgeSelected }) {
    if (!feature('BRIDGE_MODE'))
        return null;
    // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
    const enabled = useAppState(s => s.replBridgeEnabled);
    // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
    const connected = useAppState(s_0 => s_0.replBridgeConnected);
    // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
    const sessionActive = useAppState(s_1 => s_1.replBridgeSessionActive);
    // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
    const reconnecting = useAppState(s_2 => s_2.replBridgeReconnecting);
    // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
    const explicit = useAppState(s_3 => s_3.replBridgeExplicit);
    // Failed state is surfaced via notification (useReplBridge), not a footer pill.
    if (!isBridgeEnabled() || !enabled)
        return null;
    const status = getBridgeStatus({
        error: undefined,
        connected,
        sessionActive,
        reconnecting
    });
    // For implicit (config-driven) remote, only show the reconnecting state
    if (!explicit && status.label !== 'Remote Control reconnecting') {
        return null;
    }
    return React.createElement(Text, { color: bridgeSelected ? 'background' : status.color, inverse: bridgeSelected, wrap: "truncate" },
        status.label,
        bridgeSelected && React.createElement(Text, { dimColor: true }, " \u00B7 Enter to view"));
}
//# sourceMappingURL=PromptInputFooter.js.map