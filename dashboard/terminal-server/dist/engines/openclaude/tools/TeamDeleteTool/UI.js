import { jsonParse } from '../../utils/slowOperations.js';
export function renderToolUseMessage(_input) {
    return 'cleanup team: current';
}
export function renderToolResultMessage(content, _progressMessages, { verbose: _verbose }) {
    const result = typeof content === 'string' ? jsonParse(content) : content;
    // Suppress cleanup result - the batched shutdown message covers this
    if ('success' in result && 'team_name' in result && 'message' in result) {
        return null;
    }
    return null;
}
//# sourceMappingURL=UI.js.map