import React from 'react';
import { MessageResponse } from '../../components/MessageResponse.js';
import { Text } from '../../ink.js';
import { truncate } from '../../utils/format.js';
// --- CronCreate -------------------------------------------------------------
export function renderCreateToolUseMessage(input) {
    return `${input.cron ?? ''}${input.prompt ? `: ${truncate(input.prompt, 60, true)}` : ''}`;
}
export function renderCreateResultMessage(output) {
    return React.createElement(MessageResponse, null,
        React.createElement(Text, null,
            "Scheduled ",
            React.createElement(Text, { bold: true }, output.id),
            ' ',
            React.createElement(Text, { dimColor: true },
                "(",
                output.humanSchedule,
                ")")));
}
// --- CronDelete -------------------------------------------------------------
export function renderDeleteToolUseMessage(input) {
    return input.id ?? '';
}
export function renderDeleteResultMessage(output) {
    return React.createElement(MessageResponse, null,
        React.createElement(Text, null,
            "Cancelled ",
            React.createElement(Text, { bold: true }, output.id)));
}
// --- CronList ---------------------------------------------------------------
export function renderListToolUseMessage() {
    return '';
}
export function renderListResultMessage(output) {
    if (output.jobs.length === 0) {
        return React.createElement(MessageResponse, null,
            React.createElement(Text, { dimColor: true }, "No scheduled jobs"));
    }
    return React.createElement(MessageResponse, null, output.jobs.map(j => React.createElement(Text, { key: j.id },
        React.createElement(Text, { bold: true }, j.id),
        " ",
        React.createElement(Text, { dimColor: true }, j.humanSchedule))));
}
// --- Shared -----------------------------------------------------------------
//# sourceMappingURL=UI.js.map