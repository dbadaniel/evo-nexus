import { getSdkAgentProgressSummariesEnabled } from '../../bootstrap/state.js';
import { OUTPUT_FILE_TAG, STATUS_TAG, SUMMARY_TAG, TASK_ID_TAG, TASK_NOTIFICATION_TAG, TOOL_USE_ID_TAG, WORKTREE_BRANCH_TAG, WORKTREE_PATH_TAG, WORKTREE_TAG } from '../../constants/xml.js';
import { abortSpeculation } from '../../services/PromptSuggestion/speculation.js';
import { createTaskStateBase } from '../../Task.js';
import { findToolByName } from '../../Tool.js';
import { SYNTHETIC_OUTPUT_TOOL_NAME } from '../../tools/SyntheticOutputTool/SyntheticOutputTool.js';
import { asAgentId } from '../../types/ids.js';
import { createAbortController, createChildAbortController } from '../../utils/abortController.js';
import { registerCleanup } from '../../utils/cleanupRegistry.js';
import { getToolSearchOrReadInfo } from '../../utils/collapseReadSearch.js';
import { enqueuePendingNotification } from '../../utils/messageQueueManager.js';
import { getAgentTranscriptPath } from '../../utils/sessionStorage.js';
import { evictTaskOutput, getTaskOutputPath, initTaskOutputAsSymlink } from '../../utils/task/diskOutput.js';
import { PANEL_GRACE_MS, registerTask, updateTaskState } from '../../utils/task/framework.js';
import { emitTaskProgress } from '../../utils/task/sdkProgress.js';
const MAX_RECENT_ACTIVITIES = 5;
export function createProgressTracker() {
    return {
        toolUseCount: 0,
        latestInputTokens: 0,
        cumulativeOutputTokens: 0,
        recentActivities: []
    };
}
export function getTokenCountFromTracker(tracker) {
    return tracker.latestInputTokens + tracker.cumulativeOutputTokens;
}
export function updateProgressFromMessage(tracker, message, resolveActivityDescription, tools) {
    if (message.type !== 'assistant') {
        return;
    }
    const usage = message.message.usage;
    // Keep latest input (it's cumulative in the API), sum outputs
    tracker.latestInputTokens = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
    tracker.cumulativeOutputTokens += usage.output_tokens;
    for (const content of message.message.content) {
        if (content.type === 'tool_use') {
            tracker.toolUseCount++;
            // Omit StructuredOutput from preview - it's an internal tool
            if (content.name !== SYNTHETIC_OUTPUT_TOOL_NAME) {
                const input = content.input;
                const classification = tools ? getToolSearchOrReadInfo(content.name, input, tools) : undefined;
                tracker.recentActivities.push({
                    toolName: content.name,
                    input,
                    activityDescription: resolveActivityDescription?.(content.name, input),
                    isSearch: classification?.isSearch,
                    isRead: classification?.isRead
                });
            }
        }
    }
    while (tracker.recentActivities.length > MAX_RECENT_ACTIVITIES) {
        tracker.recentActivities.shift();
    }
}
export function getProgressUpdate(tracker) {
    return {
        toolUseCount: tracker.toolUseCount,
        tokenCount: getTokenCountFromTracker(tracker),
        lastActivity: tracker.recentActivities.length > 0 ? tracker.recentActivities[tracker.recentActivities.length - 1] : undefined,
        recentActivities: [...tracker.recentActivities]
    };
}
/**
 * Creates an ActivityDescriptionResolver from a tools list.
 * Looks up the tool by name and calls getActivityDescription if available.
 */
export function createActivityDescriptionResolver(tools) {
    return (toolName, input) => {
        const tool = findToolByName(tools, toolName);
        return tool?.getActivityDescription?.(input) ?? undefined;
    };
}
export function isLocalAgentTask(task) {
    return typeof task === 'object' && task !== null && 'type' in task && task.type === 'local_agent';
}
/**
 * A local_agent task that the CoordinatorTaskPanel manages (not main-session).
 * For ants, these render in the panel instead of the background-task pill.
 * This is the ONE predicate that all pill/panel filters must agree on — if
 * the gate changes, change it here.
 */
export function isPanelAgentTask(t) {
    return isLocalAgentTask(t) && t.agentType !== 'main-session';
}
export function queuePendingMessage(taskId, msg, setAppState) {
    updateTaskState(taskId, setAppState, task => ({
        ...task,
        pendingMessages: [...task.pendingMessages, msg]
    }));
}
/**
 * Append a message to task.messages so it appears in the viewed transcript
 * immediately. Caller constructs the Message (breaks the messages.ts cycle).
 * queuePendingMessage and resumeAgentBackground route the prompt to the
 * agent's API input but don't touch the display.
 */
export function appendMessageToLocalAgent(taskId, message, setAppState) {
    updateTaskState(taskId, setAppState, task => ({
        ...task,
        messages: [...(task.messages ?? []), message]
    }));
}
export function drainPendingMessages(taskId, getAppState, setAppState) {
    const task = getAppState().tasks[taskId];
    if (!isLocalAgentTask(task) || task.pendingMessages.length === 0) {
        return [];
    }
    const drained = task.pendingMessages;
    updateTaskState(taskId, setAppState, t => ({
        ...t,
        pendingMessages: []
    }));
    return drained;
}
/**
 * Enqueue an agent notification to the message queue.
 */
export function enqueueAgentNotification({ taskId, description, status, error, setAppState, finalMessage, usage, toolUseId, worktreePath, worktreeBranch }) {
    // Atomically check and set notified flag to prevent duplicate notifications.
    // If the task was already marked as notified (e.g., by TaskStopTool), skip
    // enqueueing to avoid sending redundant messages to the model.
    let shouldEnqueue = false;
    updateTaskState(taskId, setAppState, task => {
        if (task.notified) {
            return task;
        }
        shouldEnqueue = true;
        return {
            ...task,
            notified: true
        };
    });
    if (!shouldEnqueue) {
        return;
    }
    // Abort any active speculation — background task state changed, so speculated
    // results may reference stale task output. The prompt suggestion text is
    // preserved; only the pre-computed response is discarded.
    abortSpeculation(setAppState);
    const summary = status === 'completed' ? `Agent "${description}" completed` : status === 'failed' ? `Agent "${description}" failed: ${error || 'Unknown error'}` : `Agent "${description}" was stopped`;
    const outputPath = getTaskOutputPath(taskId);
    const toolUseIdLine = toolUseId ? `\n<${TOOL_USE_ID_TAG}>${toolUseId}</${TOOL_USE_ID_TAG}>` : '';
    const resultSection = finalMessage ? `\n<result>${finalMessage}</result>` : '';
    const usageSection = usage ? `\n<usage><total_tokens>${usage.totalTokens}</total_tokens><tool_uses>${usage.toolUses}</tool_uses><duration_ms>${usage.durationMs}</duration_ms></usage>` : '';
    const worktreeSection = worktreePath ? `\n<${WORKTREE_TAG}><${WORKTREE_PATH_TAG}>${worktreePath}</${WORKTREE_PATH_TAG}>${worktreeBranch ? `<${WORKTREE_BRANCH_TAG}>${worktreeBranch}</${WORKTREE_BRANCH_TAG}>` : ''}</${WORKTREE_TAG}>` : '';
    const message = `<${TASK_NOTIFICATION_TAG}>
<${TASK_ID_TAG}>${taskId}</${TASK_ID_TAG}>${toolUseIdLine}
<${OUTPUT_FILE_TAG}>${outputPath}</${OUTPUT_FILE_TAG}>
<${STATUS_TAG}>${status}</${STATUS_TAG}>
<${SUMMARY_TAG}>${summary}</${SUMMARY_TAG}>${resultSection}${usageSection}${worktreeSection}
</${TASK_NOTIFICATION_TAG}>`;
    enqueuePendingNotification({
        value: message,
        mode: 'task-notification'
    });
}
/**
 * LocalAgentTask - Handles background agent execution.
 *
 * Replaces the AsyncAgent implementation from src/tools/AgentTool/asyncAgentUtils.ts
 * with a unified Task interface.
 */
export const LocalAgentTask = {
    name: 'LocalAgentTask',
    type: 'local_agent',
    async kill(taskId, setAppState) {
        killAsyncAgent(taskId, setAppState);
    }
};
/**
 * Kill an agent task. No-op if already killed/completed.
 */
export function killAsyncAgent(taskId, setAppState) {
    let killed = false;
    updateTaskState(taskId, setAppState, task => {
        if (task.status !== 'running') {
            return task;
        }
        killed = true;
        task.abortController?.abort();
        task.unregisterCleanup?.();
        return {
            ...task,
            status: 'killed',
            endTime: Date.now(),
            evictAfter: task.retain ? undefined : Date.now() + PANEL_GRACE_MS,
            abortController: undefined,
            unregisterCleanup: undefined,
            selectedAgent: undefined
        };
    });
    if (killed) {
        void evictTaskOutput(taskId);
    }
}
/**
 * Kill all running agent tasks.
 * Used by ESC cancellation in coordinator mode to stop all subagents.
 */
export function killAllRunningAgentTasks(tasks, setAppState) {
    for (const [taskId, task] of Object.entries(tasks)) {
        if (task.type === 'local_agent' && task.status === 'running') {
            killAsyncAgent(taskId, setAppState);
        }
    }
}
/**
 * Mark a task as notified without enqueueing a notification.
 * Used by chat:killAgents bulk kill to suppress per-agent async notifications
 * when a single aggregate message is sent instead.
 */
export function markAgentsNotified(taskId, setAppState) {
    updateTaskState(taskId, setAppState, task => {
        if (task.notified) {
            return task;
        }
        return {
            ...task,
            notified: true
        };
    });
}
/**
 * Update progress for an agent task.
 * Preserves the existing summary field so that background summarization
 * results are not clobbered by progress updates from assistant messages.
 */
export function updateAgentProgress(taskId, progress, setAppState) {
    updateTaskState(taskId, setAppState, task => {
        if (task.status !== 'running') {
            return task;
        }
        const existingSummary = task.progress?.summary;
        return {
            ...task,
            progress: existingSummary ? {
                ...progress,
                summary: existingSummary
            } : progress
        };
    });
}
/**
 * Update the background summary for an agent task.
 * Called by the periodic summarization service to store a 1-2 sentence progress summary.
 */
export function updateAgentSummary(taskId, summary, setAppState) {
    let captured = null;
    updateTaskState(taskId, setAppState, task => {
        if (task.status !== 'running') {
            return task;
        }
        captured = {
            tokenCount: task.progress?.tokenCount ?? 0,
            toolUseCount: task.progress?.toolUseCount ?? 0,
            startTime: task.startTime,
            toolUseId: task.toolUseId
        };
        return {
            ...task,
            progress: {
                ...task.progress,
                toolUseCount: task.progress?.toolUseCount ?? 0,
                tokenCount: task.progress?.tokenCount ?? 0,
                summary
            }
        };
    });
    // Emit summary to SDK consumers (e.g. VS Code subagent panel). No-op in TUI.
    // Gate on the SDK option so coordinator-mode sessions without the flag don't
    // leak summary events to consumers who didn't opt in.
    if (captured && getSdkAgentProgressSummariesEnabled()) {
        const { tokenCount, toolUseCount, startTime, toolUseId } = captured;
        emitTaskProgress({
            taskId,
            toolUseId,
            description: summary,
            startTime,
            totalTokens: tokenCount,
            toolUses: toolUseCount,
            summary
        });
    }
}
/**
 * Complete an agent task with result.
 */
export function completeAgentTask(result, setAppState) {
    const taskId = result.agentId;
    updateTaskState(taskId, setAppState, task => {
        if (task.status !== 'running') {
            return task;
        }
        task.unregisterCleanup?.();
        return {
            ...task,
            status: 'completed',
            result,
            endTime: Date.now(),
            evictAfter: task.retain ? undefined : Date.now() + PANEL_GRACE_MS,
            abortController: undefined,
            unregisterCleanup: undefined,
            selectedAgent: undefined
        };
    });
    void evictTaskOutput(taskId);
    // Note: Notification is sent by AgentTool via enqueueAgentNotification
}
/**
 * Fail an agent task with error.
 */
export function failAgentTask(taskId, error, setAppState) {
    updateTaskState(taskId, setAppState, task => {
        if (task.status !== 'running') {
            return task;
        }
        task.unregisterCleanup?.();
        return {
            ...task,
            status: 'failed',
            error,
            endTime: Date.now(),
            evictAfter: task.retain ? undefined : Date.now() + PANEL_GRACE_MS,
            abortController: undefined,
            unregisterCleanup: undefined,
            selectedAgent: undefined
        };
    });
    void evictTaskOutput(taskId);
    // Note: Notification is sent by AgentTool via enqueueAgentNotification
}
/**
 * Register an agent task.
 * Called by AgentTool to create a new background agent.
 *
 * @param parentAbortController - Optional parent abort controller. If provided,
 *   the agent's abort controller will be a child that auto-aborts when parent aborts.
 *   This ensures subagents are aborted when their parent (e.g., in-process teammate) aborts.
 */
export function registerAsyncAgent({ agentId, description, prompt, selectedAgent, setAppState, parentAbortController, toolUseId }) {
    void initTaskOutputAsSymlink(agentId, getAgentTranscriptPath(asAgentId(agentId)));
    // Create abort controller - if parent provided, create child that auto-aborts with parent
    const abortController = parentAbortController ? createChildAbortController(parentAbortController) : createAbortController();
    const taskState = {
        ...createTaskStateBase(agentId, 'local_agent', description, toolUseId),
        type: 'local_agent',
        status: 'running',
        agentId,
        prompt,
        selectedAgent,
        agentType: selectedAgent.agentType ?? 'general-purpose',
        abortController,
        retrieved: false,
        lastReportedToolCount: 0,
        lastReportedTokenCount: 0,
        isBackgrounded: true,
        // registerAsyncAgent immediately backgrounds
        pendingMessages: [],
        retain: false,
        diskLoaded: false
    };
    // Register cleanup handler
    const unregisterCleanup = registerCleanup(async () => {
        killAsyncAgent(agentId, setAppState);
    });
    taskState.unregisterCleanup = unregisterCleanup;
    // Register task in AppState
    registerTask(taskState, setAppState);
    return taskState;
}
// Map of taskId -> resolve function for background signals
// When backgroundAgentTask is called, it resolves the corresponding promise
const backgroundSignalResolvers = new Map();
/**
 * Register a foreground agent task that could be backgrounded later.
 * Called when an agent has been running long enough to show the BackgroundHint.
 * @returns object with taskId and backgroundSignal promise
 */
export function registerAgentForeground({ agentId, description, prompt, selectedAgent, setAppState, autoBackgroundMs, toolUseId }) {
    void initTaskOutputAsSymlink(agentId, getAgentTranscriptPath(asAgentId(agentId)));
    const abortController = createAbortController();
    const unregisterCleanup = registerCleanup(async () => {
        killAsyncAgent(agentId, setAppState);
    });
    const taskState = {
        ...createTaskStateBase(agentId, 'local_agent', description, toolUseId),
        type: 'local_agent',
        status: 'running',
        agentId,
        prompt,
        selectedAgent,
        agentType: selectedAgent.agentType ?? 'general-purpose',
        abortController,
        unregisterCleanup,
        retrieved: false,
        lastReportedToolCount: 0,
        lastReportedTokenCount: 0,
        isBackgrounded: false,
        // Not yet backgrounded - running in foreground
        pendingMessages: [],
        retain: false,
        diskLoaded: false
    };
    // Create background signal promise
    let resolveBackgroundSignal;
    const backgroundSignal = new Promise(resolve => {
        resolveBackgroundSignal = resolve;
    });
    backgroundSignalResolvers.set(agentId, resolveBackgroundSignal);
    registerTask(taskState, setAppState);
    // Auto-background after timeout if configured
    let cancelAutoBackground;
    if (autoBackgroundMs !== undefined && autoBackgroundMs > 0) {
        const timer = setTimeout((setAppState, agentId) => {
            // Mark task as backgrounded and resolve the signal
            setAppState(prev => {
                const prevTask = prev.tasks[agentId];
                if (!isLocalAgentTask(prevTask) || prevTask.isBackgrounded) {
                    return prev;
                }
                return {
                    ...prev,
                    tasks: {
                        ...prev.tasks,
                        [agentId]: {
                            ...prevTask,
                            isBackgrounded: true
                        }
                    }
                };
            });
            const resolver = backgroundSignalResolvers.get(agentId);
            if (resolver) {
                resolver();
                backgroundSignalResolvers.delete(agentId);
            }
        }, autoBackgroundMs, setAppState, agentId);
        cancelAutoBackground = () => clearTimeout(timer);
    }
    return {
        taskId: agentId,
        backgroundSignal,
        cancelAutoBackground
    };
}
/**
 * Background a specific foreground agent task.
 * @returns true if backgrounded successfully, false otherwise
 */
export function backgroundAgentTask(taskId, getAppState, setAppState) {
    const state = getAppState();
    const task = state.tasks[taskId];
    if (!isLocalAgentTask(task) || task.isBackgrounded) {
        return false;
    }
    // Update state to mark as backgrounded
    setAppState(prev => {
        const prevTask = prev.tasks[taskId];
        if (!isLocalAgentTask(prevTask)) {
            return prev;
        }
        return {
            ...prev,
            tasks: {
                ...prev.tasks,
                [taskId]: {
                    ...prevTask,
                    isBackgrounded: true
                }
            }
        };
    });
    // Resolve the background signal to interrupt the agent loop
    const resolver = backgroundSignalResolvers.get(taskId);
    if (resolver) {
        resolver();
        backgroundSignalResolvers.delete(taskId);
    }
    return true;
}
/**
 * Unregister a foreground agent task when the agent completes without being backgrounded.
 */
export function unregisterAgentForeground(taskId, setAppState) {
    // Clean up the background signal resolver
    backgroundSignalResolvers.delete(taskId);
    let cleanupFn;
    setAppState(prev => {
        const task = prev.tasks[taskId];
        // Only remove if it's a foreground task (not backgrounded)
        if (!isLocalAgentTask(task) || task.isBackgrounded) {
            return prev;
        }
        // Capture cleanup function to call outside of updater
        cleanupFn = task.unregisterCleanup;
        const { [taskId]: removed, ...rest } = prev.tasks;
        return {
            ...prev,
            tasks: rest
        };
    });
    // Call cleanup outside of the state updater (avoid side effects in updater)
    cleanupFn?.();
}
//# sourceMappingURL=LocalAgentTask.js.map