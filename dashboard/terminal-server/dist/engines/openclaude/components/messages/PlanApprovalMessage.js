import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { Markdown } from '../../components/Markdown.js';
import { Box, Text } from '../../ink.js';
import { jsonParse } from '../../utils/slowOperations.js';
import { isIdleNotification, isPlanApprovalRequest, isPlanApprovalResponse } from '../../utils/teammateMailbox.js';
import { getShutdownMessageSummary } from './ShutdownMessage.js';
import { getTaskAssignmentSummary } from './TaskAssignmentMessage.js';
/**
 * Renders a plan approval request with a planMode-colored border,
 * showing the plan content and instructions for approving/rejecting.
 */
export function PlanApprovalRequestDisplay(t0) {
    const $ = _c(10);
    const { request } = t0;
    let t1;
    if ($[0] !== request.from) {
        t1 = React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "planMode", bold: true },
                "Plan Approval Request from ",
                request.from));
        $[0] = request.from;
        $[1] = t1;
    }
    else {
        t1 = $[1];
    }
    let t2;
    if ($[2] !== request.planContent) {
        t2 = React.createElement(Box, { borderStyle: "dashed", borderColor: "subtle", borderLeft: false, borderRight: false, flexDirection: "column", paddingX: 1, marginBottom: 1 },
            React.createElement(Markdown, null, request.planContent));
        $[2] = request.planContent;
        $[3] = t2;
    }
    else {
        t2 = $[3];
    }
    let t3;
    if ($[4] !== request.planFilePath) {
        t3 = React.createElement(Text, { dimColor: true },
            "Plan file: ",
            request.planFilePath);
        $[4] = request.planFilePath;
        $[5] = t3;
    }
    else {
        t3 = $[5];
    }
    let t4;
    if ($[6] !== t1 || $[7] !== t2 || $[8] !== t3) {
        t4 = React.createElement(Box, { flexDirection: "column", marginY: 1 },
            React.createElement(Box, { borderStyle: "round", borderColor: "planMode", flexDirection: "column", paddingX: 1 },
                t1,
                t2,
                t3));
        $[6] = t1;
        $[7] = t2;
        $[8] = t3;
        $[9] = t4;
    }
    else {
        t4 = $[9];
    }
    return t4;
}
/**
 * Renders a plan approval response with a success (green) or error (red) border.
 */
export function PlanApprovalResponseDisplay(t0) {
    const $ = _c(13);
    const { response, senderName } = t0;
    if (response.approved) {
        let t1;
        if ($[0] !== senderName) {
            t1 = React.createElement(Box, null,
                React.createElement(Text, { color: "success", bold: true },
                    "\u2713 Plan Approved by ",
                    senderName));
            $[0] = senderName;
            $[1] = t1;
        }
        else {
            t1 = $[1];
        }
        let t2;
        if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
            t2 = React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, null, "You can now proceed with implementation. Your plan mode restrictions have been lifted."));
            $[2] = t2;
        }
        else {
            t2 = $[2];
        }
        let t3;
        if ($[3] !== t1) {
            t3 = React.createElement(Box, { flexDirection: "column", marginY: 1 },
                React.createElement(Box, { borderStyle: "round", borderColor: "success", flexDirection: "column", paddingX: 1, paddingY: 1 },
                    t1,
                    t2));
            $[3] = t1;
            $[4] = t3;
        }
        else {
            t3 = $[4];
        }
        return t3;
    }
    let t1;
    if ($[5] !== senderName) {
        t1 = React.createElement(Box, null,
            React.createElement(Text, { color: "error", bold: true },
                "\u2717 Plan Rejected by ",
                senderName));
        $[5] = senderName;
        $[6] = t1;
    }
    else {
        t1 = $[6];
    }
    let t2;
    if ($[7] !== response.feedback) {
        t2 = response.feedback && React.createElement(Box, { marginTop: 1, borderStyle: "dashed", borderColor: "subtle", borderLeft: false, borderRight: false, paddingX: 1 },
            React.createElement(Text, null,
                "Feedback: ",
                response.feedback));
        $[7] = response.feedback;
        $[8] = t2;
    }
    else {
        t2 = $[8];
    }
    let t3;
    if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { dimColor: true }, "Please revise your plan based on the feedback and call ExitPlanMode again."));
        $[9] = t3;
    }
    else {
        t3 = $[9];
    }
    let t4;
    if ($[10] !== t1 || $[11] !== t2) {
        t4 = React.createElement(Box, { flexDirection: "column", marginY: 1 },
            React.createElement(Box, { borderStyle: "round", borderColor: "error", flexDirection: "column", paddingX: 1, paddingY: 1 },
                t1,
                t2,
                t3));
        $[10] = t1;
        $[11] = t2;
        $[12] = t4;
    }
    else {
        t4 = $[12];
    }
    return t4;
}
/**
 * Try to parse and render a plan approval message from raw content.
 * Returns the rendered component if it's a plan approval message, null otherwise.
 */
export function tryRenderPlanApprovalMessage(content, senderName) {
    const request = isPlanApprovalRequest(content);
    if (request) {
        return React.createElement(PlanApprovalRequestDisplay, { request: request });
    }
    const response = isPlanApprovalResponse(content);
    if (response) {
        return React.createElement(PlanApprovalResponseDisplay, { response: response, senderName: senderName });
    }
    return null;
}
/**
 * Get a brief summary text for a plan approval message.
 * Used in places like the inbox queue where we want a short description.
 * Returns null if the content is not a plan approval message.
 */
function getPlanApprovalSummary(content) {
    const request = isPlanApprovalRequest(content);
    if (request) {
        return `[Plan Approval Request from ${request.from}]`;
    }
    const response = isPlanApprovalResponse(content);
    if (response) {
        if (response.approved) {
            return '[Plan Approved] You can now proceed with implementation';
        }
        else {
            return `[Plan Rejected] ${response.feedback || 'Please revise your plan'}`;
        }
    }
    return null;
}
/**
 * Get a brief summary text for an idle notification.
 */
function getIdleNotificationSummary(msg) {
    const parts = ['Agent idle'];
    if (msg.completedTaskId) {
        const status = msg.completedStatus || 'completed';
        parts.push(`Task ${msg.completedTaskId} ${status}`);
    }
    if (msg.summary) {
        parts.push(`Last DM: ${msg.summary}`);
    }
    return parts.join(' · ');
}
/**
 * Format teammate message content for display.
 * If it's a structured message (plan approval, shutdown, or idle), returns a formatted summary.
 * Otherwise returns the original content.
 */
export function formatTeammateMessageContent(content) {
    const planSummary = getPlanApprovalSummary(content);
    if (planSummary) {
        return planSummary;
    }
    const shutdownSummary = getShutdownMessageSummary(content);
    if (shutdownSummary) {
        return shutdownSummary;
    }
    const idleMsg = isIdleNotification(content);
    if (idleMsg) {
        return getIdleNotificationSummary(idleMsg);
    }
    const taskAssignmentSummary = getTaskAssignmentSummary(content);
    if (taskAssignmentSummary) {
        return taskAssignmentSummary;
    }
    // Check for teammate_terminated message
    try {
        const parsed = jsonParse(content);
        if (parsed?.type === 'teammate_terminated' && parsed.message) {
            return parsed.message;
        }
    }
    catch {
        // Not JSON
    }
    return content;
}
//# sourceMappingURL=PlanApprovalMessage.js.map