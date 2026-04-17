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
        return React.createElement(React.Fragment, null,
            React.createElement(FilePathLink, { filePath: notebook_path }, displayPath),
            `@${cell_id}, content: ${new_source.slice(0, 30)}…, cell_type: ${cell_type}, edit_mode: ${edit_mode ?? 'replace'}`);
    }
    return React.createElement(React.Fragment, null,
        React.createElement(FilePathLink, { filePath: notebook_path }, displayPath),
        `@${cell_id}`);
}
export function renderToolUseRejectedMessage(input, { verbose }) {
    return React.createElement(NotebookEditToolUseRejectedMessage, { notebook_path: input.notebook_path, cell_id: input.cell_id, new_source: input.new_source, cell_type: input.cell_type, edit_mode: input.edit_mode, verbose: verbose });
}
export function renderToolUseErrorMessage(result, { verbose }) {
    if (!verbose && typeof result === 'string' && extractTag(result, 'tool_use_error')) {
        return React.createElement(MessageResponse, null,
            React.createElement(Text, { color: "error" }, "Error editing notebook"));
    }
    return React.createElement(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
}
export function renderToolResultMessage({ cell_id, new_source, error }) {
    if (error) {
        return React.createElement(MessageResponse, null,
            React.createElement(Text, { color: "error" }, error));
    }
    return React.createElement(MessageResponse, null,
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, null,
                "Updated cell ",
                React.createElement(Text, { bold: true }, cell_id),
                ":"),
            React.createElement(Box, { marginLeft: 2 },
                React.createElement(HighlightedCode, { code: new_source, filePath: "notebook.py" }))));
}
//# sourceMappingURL=UI.js.map