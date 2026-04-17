import * as React from 'react';
import { SubAgentProvider } from 'src/components/CtrlOToExpand.js';
import { FallbackToolUseErrorMessage } from 'src/components/FallbackToolUseErrorMessage.js';
import { FallbackToolUseRejectedMessage } from 'src/components/FallbackToolUseRejectedMessage.js';
import { Byline } from '../../components/design-system/Byline.js';
import { Message as MessageComponent } from '../../components/Message.js';
import { MessageResponse } from '../../components/MessageResponse.js';
import { Box, Text } from '../../ink.js';
import { buildSubagentLookups, EMPTY_LOOKUPS } from '../../utils/messages.js';
import { plural } from '../../utils/stringUtils.js';
const MAX_PROGRESS_MESSAGES_TO_SHOW = 3;
const INITIALIZING_TEXT = 'Initializing…';
export function renderToolResultMessage(output) {
    // Handle forked skill result
    if ('status' in output && output.status === 'forked') {
        return React.createElement(MessageResponse, { height: 1 },
            React.createElement(Text, null,
                React.createElement(Byline, null, ['Done'])));
    }
    const parts = ['Successfully loaded skill'];
    // Show tools count (only for inline skills)
    if ('allowedTools' in output && output.allowedTools && output.allowedTools.length > 0) {
        const count = output.allowedTools.length;
        parts.push(`${count} ${plural(count, 'tool')} allowed`);
    }
    // Show model if non-default (only for inline skills)
    if ('model' in output && output.model) {
        parts.push(output.model);
    }
    return React.createElement(MessageResponse, { height: 1 },
        React.createElement(Text, null,
            React.createElement(Byline, null, parts)));
}
export function renderToolUseMessage({ skill }, { commands }) {
    if (!skill) {
        return null;
    }
    // Only legacy /commands_DEPRECATED entries need the command lookup so we can
    // preserve the slash-prefixed display. Plugin skills already carry the
    // invoked skill name in `skill`, so transcript/history rendering does not
    // need plugin command metadata.
    const command = commands?.find(c => c.name === skill);
    const displayName = command?.loadedFrom === 'commands_DEPRECATED' ? `/${skill}` : skill;
    return displayName;
}
export function renderToolUseProgressMessage(progressMessages, { tools, verbose }) {
    if (!progressMessages.length) {
        return React.createElement(MessageResponse, { height: 1 },
            React.createElement(Text, { dimColor: true }, INITIALIZING_TEXT));
    }
    // Take only the last few messages for display in non-verbose mode
    const displayedMessages = verbose ? progressMessages : progressMessages.slice(-MAX_PROGRESS_MESSAGES_TO_SHOW);
    const hiddenCount = progressMessages.length - displayedMessages.length;
    const { inProgressToolUseIDs } = buildSubagentLookups(progressMessages.map(pm => pm.data));
    return React.createElement(MessageResponse, null,
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(SubAgentProvider, null, displayedMessages.map(progressMessage => React.createElement(Box, { key: progressMessage.uuid, height: 1, overflow: "hidden" },
                React.createElement(MessageComponent, { message: progressMessage.data.message, lookups: EMPTY_LOOKUPS, addMargin: false, tools: tools, commands: [], verbose: verbose, inProgressToolUseIDs: inProgressToolUseIDs, progressMessagesForMessage: [], shouldAnimate: false, shouldShowDot: false, style: "condensed", isTranscriptMode: false, isStatic: true })))),
            hiddenCount > 0 && React.createElement(Text, { dimColor: true },
                "+",
                hiddenCount,
                " more tool ",
                plural(hiddenCount, 'use'))));
}
export function renderToolUseRejectedMessage(_input, { progressMessagesForMessage, tools, verbose }) {
    return React.createElement(React.Fragment, null,
        renderToolUseProgressMessage(progressMessagesForMessage, {
            tools,
            verbose
        }),
        React.createElement(FallbackToolUseRejectedMessage, null));
}
export function renderToolUseErrorMessage(result, { progressMessagesForMessage, tools, verbose }) {
    return React.createElement(React.Fragment, null,
        renderToolUseProgressMessage(progressMessagesForMessage, {
            tools,
            verbose
        }),
        React.createElement(FallbackToolUseErrorMessage, { result: result, verbose: verbose }));
}
//# sourceMappingURL=UI.js.map