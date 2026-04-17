import React from 'react';
import { MessageResponse } from '../../components/MessageResponse.js';
import { Text } from '../../ink.js';
import { truncate } from '../../utils/format.js';
// --- CronCreate -------------------------------------------------------------
export function renderCreateToolUseMessage(input) {
    return `${input.cron ?? ''}${input.prompt ? `: ${truncate(input.prompt, 60, true)}` : ''}`;
}
export function renderCreateResultMessage(output) {
    return <MessageResponse>
      <Text>
        Scheduled <Text bold>{output.id}</Text>{' '}
        <Text dimColor>({output.humanSchedule})</Text>
      </Text>
    </MessageResponse>;
}
// --- CronDelete -------------------------------------------------------------
export function renderDeleteToolUseMessage(input) {
    return input.id ?? '';
}
export function renderDeleteResultMessage(output) {
    return <MessageResponse>
      <Text>
        Cancelled <Text bold>{output.id}</Text>
      </Text>
    </MessageResponse>;
}
// --- CronList ---------------------------------------------------------------
export function renderListToolUseMessage() {
    return '';
}
export function renderListResultMessage(output) {
    if (output.jobs.length === 0) {
        return <MessageResponse>
        <Text dimColor>No scheduled jobs</Text>
      </MessageResponse>;
    }
    return <MessageResponse>
      {output.jobs.map(j => <Text key={j.id}>
          <Text bold>{j.id}</Text> <Text dimColor>{j.humanSchedule}</Text>
        </Text>)}
    </MessageResponse>;
}
// --- Shared -----------------------------------------------------------------
//# sourceMappingURL=UI.js.map