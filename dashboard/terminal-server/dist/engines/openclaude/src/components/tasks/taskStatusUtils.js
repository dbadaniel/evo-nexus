/**
 * Shared utilities for displaying task status across different task types.
 */
import figures from 'figures';
import { isPanelAgentTask } from 'src/tasks/LocalAgentTask/LocalAgentTask.js';
import { isBackgroundTask } from 'src/tasks/types.js';
import { summarizeRecentActivities } from 'src/utils/collapseReadSearch.js';
/**
 * Returns true if the given task status represents a terminal (finished) state.
 */
export function isTerminalStatus(status) {
    return status === 'completed' || status === 'failed' || status === 'killed';
}
/**
 * Returns the appropriate icon for a task based on status and state flags.
 */
export function getTaskStatusIcon(status, options) {
    const { isIdle, awaitingApproval, hasError, shutdownRequested } = options ?? {};
    if (hasError)
        return figures.cross;
    if (awaitingApproval)
        return figures.questionMarkPrefix;
    if (shutdownRequested)
        return figures.warning;
    if (status === 'running') {
        if (isIdle)
            return figures.ellipsis;
        return figures.play;
    }
    if (status === 'completed')
        return figures.tick;
    if (status === 'failed' || status === 'killed')
        return figures.cross;
    return figures.bullet;
}
/**
 * Returns the appropriate semantic color for a task based on status and state flags.
 */
export function getTaskStatusColor(status, options) {
    const { isIdle, awaitingApproval, hasError, shutdownRequested } = options ?? {};
    if (hasError)
        return 'error';
    if (awaitingApproval)
        return 'warning';
    if (shutdownRequested)
        return 'warning';
    if (isIdle)
        return 'background';
    if (status === 'completed')
        return 'success';
    if (status === 'failed')
        return 'error';
    if (status === 'killed')
        return 'warning';
    return 'background';
}
/**
 * Derives a human-readable activity string for an in-process teammate,
 * accounting for shutdown/approval/idle states and falling back through
 * recent-activity summary → last activity description → 'working'.
 */
export function describeTeammateActivity(t) {
    if (t.shutdownRequested)
        return 'stopping';
    if (t.awaitingPlanApproval)
        return 'awaiting approval';
    if (t.isIdle)
        return 'idle';
    return (t.progress?.recentActivities && summarizeRecentActivities(t.progress.recentActivities)) ?? t.progress?.lastActivity?.activityDescription ?? 'working';
}
/**
 * Returns true when BackgroundTaskStatus would render nothing because the
 * spinner tree is active and every visible background task is an in-process
 * teammate (teammates are shown in the spinner tree instead).
 *
 * Uses the same task filtering as BackgroundTaskStatus: `isBackgroundTask()`
 * plus exclusion of panel-managed agent tasks for ants (those are shown
 * by CoordinatorTaskPanel).
 */
export function shouldHideTasksFooter(tasks, showSpinnerTree) {
    if (!showSpinnerTree)
        return false;
    let hasVisibleTask = false;
    for (const t of Object.values(tasks)) {
        if (!isBackgroundTask(t) || "external" === 'ant' && isPanelAgentTask(t)) {
            continue;
        }
        hasVisibleTask = true;
        if (t.type !== 'in_process_teammate')
            return false;
    }
    return hasVisibleTask;
}
//# sourceMappingURL=taskStatusUtils.js.map