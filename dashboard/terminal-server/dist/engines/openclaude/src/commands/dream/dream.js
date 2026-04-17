import { isAutoMemoryEnabled, getAutoMemPath } from '../../memdir/paths.js';
import { getProjectDir } from '../../utils/sessionStorage.js';
import { getOriginalCwd, getSessionId } from '../../bootstrap/state.js';
import { buildConsolidationPrompt } from '../../services/autoDream/consolidationPrompt.js';
import { readLastConsolidatedAt, listSessionsTouchedSince, recordConsolidation, } from '../../services/autoDream/consolidationLock.js';
const command = {
    type: 'prompt',
    name: 'dream',
    description: 'Run memory consolidation — synthesize recent sessions into durable memories',
    isEnabled: () => isAutoMemoryEnabled(),
    progressMessage: 'consolidating memories',
    contentLength: 0,
    source: 'builtin',
    async getPromptForCommand() {
        const memoryRoot = getAutoMemPath();
        const transcriptDir = getProjectDir(getOriginalCwd());
        let lastAt;
        try {
            lastAt = await readLastConsolidatedAt();
        }
        catch {
            lastAt = 0;
        }
        let sessionIds;
        try {
            sessionIds = await listSessionsTouchedSince(lastAt);
        }
        catch {
            sessionIds = [];
        }
        const currentSession = getSessionId();
        sessionIds = sessionIds.filter(id => id !== currentSession);
        if (sessionIds.length === 0) {
            sessionIds = [currentSession];
        }
        const hoursSince = lastAt > 0
            ? `${((Date.now() - lastAt) / 3_600_000).toFixed(1)}h ago`
            : 'never';
        const extra = `
**Manually triggered by user via /dream.**

Sessions since last consolidation (${sessionIds.length}, last run: ${hoursSince}):
${sessionIds.map(id => `- ${id}`).join('\n')}`;
        const prompt = buildConsolidationPrompt(memoryRoot, transcriptDir, extra);
        // Record consolidation timestamp programmatically so auto-dream
        // knows when the last manual run happened.
        await recordConsolidation();
        return [{ type: 'text', text: prompt }];
    },
};
export default command;
//# sourceMappingURL=dream.js.map