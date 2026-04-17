import * as React from 'react';
import { extractTag } from 'src/utils/messages.js';
import { FallbackToolUseErrorMessage } from '../../components/FallbackToolUseErrorMessage.js';
import { FilePathLink } from '../../components/FilePathLink.js';
import { HighlightedCode } from '../../components/HighlightedCode.js';
import { MessageResponse } from '../../components/MessageResponse.js';
import { NotebookEditToolUseRejectedMessage } from '../../components/NotebookEditToolUseRejectedMessage.js';
import { Box, Text } from '../../ink.js';
import { getDisplayPath } from '../../utils/file.js';
export function getToolUseSummary(input) {
    if (!input?.notebook_path) {
        return null;
    }
    return getDisplayPath(input.notebook_path);
}
export function renderToolUseMessage({ notebook_path, cell_id, new_source, cell_type, edit_mode }, { verbose }) {
    if (!notebook_path || !new_source || !cell_type) {
        return null;
    }
    const displayPath = verbose ? notebook_path : getDisplayPath(notebook_path);
    if (verbose) {
        return <>
        <FilePathLink filePath={notebook_path}>{displayPath}</FilePathLink>
        {`@${cell_id}, content: ${new_source.slice(0, 30)}…, cell_type: ${cell_type}, edit_mode: ${edit_mode ?? 'replace'}`}
      </>;
    }
    return <>
      <FilePathLink filePath={notebook_path}>{displayPath}</FilePathLink>
      {`@${cell_id}`}
    </>;
}
export function renderToolUseRejectedMessage(input, { verbose }) {
    return <NotebookEditToolUseRejectedMessage notebook_path={input.notebook_path} cell_id={input.cell_id} new_source={input.new_source} cell_type={input.cell_type} edit_mode={input.edit_mode} verbose={verbose}/>;
}
export function renderToolUseErrorMessage(result, { verbose }) {
    if (!verbose && typeof result === 'string' && extractTag(result, 'tool_use_error')) {
        return <MessageResponse>
        <Text color="error">Error editing notebook</Text>
      </MessageResponse>;
    }
    return <FallbackToolUseErrorMessage result={result} verbose={verbose}/>;
}
export function renderToolResultMessage({ cell_id, new_source, error }) {
    if (error) {
        return <MessageResponse>
        <Text color="error">{error}</Text>
      </MessageResponse>;
    }
    return <MessageResponse>
      <Box flexDirection="column">
        <Text>
          Updated cell <Text bold>{cell_id}</Text>:
        </Text>
        <Box marginLeft={2}>
          <HighlightedCode code={new_source} filePath="notebook.py"/>
        </Box>
      </Box>
    </MessageResponse>;
}
//# sourceMappingURL=UI.js.map