import * as React from 'react';
import { Box, Text } from '../../ink.js';
export function renderToolUseMessage() {
    return 'Creating worktree…';
}
export function renderToolResultMessage(output, _progressMessagesForMessage, _options) {
    return <Box flexDirection="column">
      <Text>
        Switched to worktree on branch <Text bold>{output.worktreeBranch}</Text>
      </Text>
      <Text dimColor>{output.worktreePath}</Text>
    </Box>;
}
//# sourceMappingURL=UI.js.map