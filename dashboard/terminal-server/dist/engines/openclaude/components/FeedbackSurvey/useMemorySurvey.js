import { useCallback, useEffect, useMemo, useRef } from 'react';
import { isFeedbackSurveyDisabled } from 'src/services/analytics/config.js';
import { getFeatureValue_CACHED_MAY_BE_STALE } from 'src/services/analytics/growthbook.js';
import { logEvent } from 'src/services/analytics/index.js';
import { isAutoMemoryEnabled } from '../../memdir/paths.js';
import { isPolicyAllowed } from '../../services/policyLimits/index.js';
import { FILE_READ_TOOL_NAME } from '../../tools/FileReadTool/prompt.js';
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js';
import { isEnvTruthy } from '../../utils/envUtils.js';
import { isAutoManagedMemoryFile } from '../../utils/memoryFileDetection.js';
import { extractTextContent, getLastAssistantMessage } from '../../utils/messages.js';
import { logOTelEvent } from '../../utils/telemetry/events.js';
import { submitTranscriptShare } from './submitTranscriptShare.js';
import { useSurveyState } from './useSurveyState.js';
const HIDE_THANKS_AFTER_MS = 3000;
const MEMORY_SURVEY_GATE = 'tengu_dunwich_bell';
const MEMORY_SURVEY_EVENT = 'tengu_memory_survey_event';
const SURVEY_PROBABILITY = 0.2;
const TRANSCRIPT_SHARE_TRIGGER = 'memory_survey';
const MEMORY_WORD_RE = /\bmemor(?:y|ies)\b/i;
function hasMemoryFileRead(messages) {
    for (const message of messages) {
        if (message.type !== 'assistant') {
            continue;
        }
        const content = message.message.content;
        if (!Array.isArray(content)) {
            continue;
        }
        for (const block of content) {
            if (block.type !== 'tool_use' || block.name !== FILE_READ_TOOL_NAME) {
                continue;
            }
            const input = block.input;
            if (typeof input.file_path === 'string' && isAutoManagedMemoryFile(input.file_path)) {
                return true;
            }
        }
    }
    return false;
}
export function useMemorySurvey(messages, isLoading, hasActivePrompt = false, { enabled = true } = {}) {
    // Track assistant message UUIDs that were already evaluated so we don't
    // re-roll probability on re-renders or re-scan messages for the same turn.
    const seenAssistantUuids = useRef(new Set());
    // Once a memory file read is observed it stays true for the session —
    // skip the O(n) scan on subsequent turns.
    const memoryReadSeen = useRef(false);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const onOpen = useCallback((appearanceId) => {
        logEvent(MEMORY_SURVEY_EVENT, {
            event_type: 'appeared',
            appearance_id: appearanceId
        });
        void logOTelEvent('feedback_survey', {
            event_type: 'appeared',
            appearance_id: appearanceId,
            survey_type: 'memory'
        });
    }, []);
    const onSelect = useCallback((appearanceId_0, selected) => {
        logEvent(MEMORY_SURVEY_EVENT, {
            event_type: 'responded',
            appearance_id: appearanceId_0,
            response: selected
        });
        void logOTelEvent('feedback_survey', {
            event_type: 'responded',
            appearance_id: appearanceId_0,
            response: selected,
            survey_type: 'memory'
        });
    }, []);
    const shouldShowTranscriptPrompt = useCallback((selected_0) => {
        if ("external" !== 'ant') {
            return false;
        }
        if (selected_0 !== 'bad' && selected_0 !== 'good') {
            return false;
        }
        if (getGlobalConfig().transcriptShareDismissed) {
            return false;
        }
        if (!isPolicyAllowed('allow_product_feedback')) {
            return false;
        }
        return true;
    }, []);
    const onTranscriptPromptShown = useCallback((appearanceId_1) => {
        logEvent(MEMORY_SURVEY_EVENT, {
            event_type: 'transcript_prompt_appeared',
            appearance_id: appearanceId_1,
            trigger: TRANSCRIPT_SHARE_TRIGGER
        });
        void logOTelEvent('feedback_survey', {
            event_type: 'transcript_prompt_appeared',
            appearance_id: appearanceId_1,
            survey_type: 'memory'
        });
    }, []);
    const onTranscriptSelect = useCallback(async (appearanceId_2, selected_1) => {
        logEvent(MEMORY_SURVEY_EVENT, {
            event_type: `transcript_share_${selected_1}`,
            appearance_id: appearanceId_2,
            trigger: TRANSCRIPT_SHARE_TRIGGER
        });
        if (selected_1 === 'dont_ask_again') {
            saveGlobalConfig(current => ({
                ...current,
                transcriptShareDismissed: true
            }));
        }
        if (selected_1 === 'yes') {
            const result = await submitTranscriptShare(messagesRef.current, TRANSCRIPT_SHARE_TRIGGER, appearanceId_2);
            logEvent(MEMORY_SURVEY_EVENT, {
                event_type: (result.success ? 'transcript_share_submitted' : 'transcript_share_failed'),
                appearance_id: appearanceId_2,
                trigger: TRANSCRIPT_SHARE_TRIGGER
            });
            return result.success;
        }
        return false;
    }, []);
    const { state, lastResponse, open, handleSelect, handleTranscriptSelect } = useSurveyState({
        hideThanksAfterMs: HIDE_THANKS_AFTER_MS,
        onOpen,
        onSelect,
        shouldShowTranscriptPrompt,
        onTranscriptPromptShown,
        onTranscriptSelect
    });
    const lastAssistant = useMemo(() => getLastAssistantMessage(messages), [messages]);
    useEffect(() => {
        if (!enabled)
            return;
        // /clear resets messages but REPL stays mounted — reset refs so a memory
        // read from the previous conversation doesn't leak into the new one.
        if (messages.length === 0) {
            memoryReadSeen.current = false;
            seenAssistantUuids.current.clear();
            return;
        }
        if (state !== 'closed' || isLoading || hasActivePrompt) {
            return;
        }
        // 3P default: survey off (no GrowthBook on Bedrock/Vertex/Foundry).
        if (!getFeatureValue_CACHED_MAY_BE_STALE(MEMORY_SURVEY_GATE, false)) {
            return;
        }
        if (!isAutoMemoryEnabled()) {
            return;
        }
        if (isFeedbackSurveyDisabled()) {
            return;
        }
        if (!isPolicyAllowed('allow_product_feedback')) {
            return;
        }
        if (isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY)) {
            return;
        }
        if (!lastAssistant || seenAssistantUuids.current.has(lastAssistant.uuid)) {
            return;
        }
        const text = extractTextContent(lastAssistant.message.content, ' ');
        if (!MEMORY_WORD_RE.test(text)) {
            return;
        }
        // Mark as evaluated before the memory-read scan so a turn that mentions
        // "memory" but has no memory read doesn't trigger repeated O(n) scans
        // on subsequent renders with the same last assistant message.
        seenAssistantUuids.current.add(lastAssistant.uuid);
        if (!memoryReadSeen.current) {
            memoryReadSeen.current = hasMemoryFileRead(messages);
        }
        if (!memoryReadSeen.current) {
            return;
        }
        if (Math.random() < SURVEY_PROBABILITY) {
            open();
        }
    }, [enabled, state, isLoading, hasActivePrompt, lastAssistant, messages, open]);
    return {
        state,
        lastResponse,
        handleSelect,
        handleTranscriptSelect
    };
}
//# sourceMappingURL=useMemorySurvey.js.map