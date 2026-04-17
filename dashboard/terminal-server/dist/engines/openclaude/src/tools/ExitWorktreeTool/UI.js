import * as React from 'react';
import { Box, Text } from '../../ink.js';
export function renderToolUseMessage() {
    return 'Exiting worktree…';
}
export function renderToolResultMessage(output, _progressMessagesForMessage, _options) {
    const actionLabel = output.action === 'keep' ? 'Kept worktree' : 'Removed worktree';
    return <Box flexDirection="column">
      <Text>
        {actionLabel}
        {output.worktreeBranch ? <>
            {' '}
            (branch <Text bold>{output.worktreeBranch}</Text>)
          </> : null}
      </Text>
      <Text dimColor>Returned to {output.originalCwd}</Text>
    </Box>;
}
//# sourceMappingURL=UI.js.map