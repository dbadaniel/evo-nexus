import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { isTaskAssignment } from '../../utils/teammateMailbox.js';
/**
 * Renders a task assignment with a cyan border (team-related color).
 */
export function TaskAssignmentDisplay(t0) {
    const $ = _c(11);
    const { assignment } = t0;
    let t1;
    if ($[0] !== assignment.assignedBy || $[1] !== assignment.taskId) {
        t1 = React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "cyan_FOR_SUBAGENTS_ONLY", bold: true },
                "Task #",
                assignment.taskId,
                " assigned by ",
                assignment.assignedBy));
        $[0] = assignment.assignedBy;
        $[1] = assignment.taskId;
        $[2] = t1;
    }
    else {
        t1 = $[2];
    }
    let t2;
    if ($[3] !== assignment.subject) {
        t2 = React.createElement(Box, null,
            React.createElement(Text, { bold: true }, assignment.subject));
        $[3] = assignment.subject;
        $[4] = t2;
    }
    else {
        t2 = $[4];
    }
    let t3;
    if ($[5] !== assignment.description) {
        t3 = assignment.description && React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { dimColor: true }, assignment.description));
        $[5] = assignment.description;
        $[6] = t3;
    }
    else {
        t3 = $[6];
    }
    let t4;
    if ($[7] !== t1 || $[8] !== t2 || $[9] !== t3) {
        t4 = React.createElement(Box, { flexDirection: "column", marginY: 1 },
            React.createElement(Box, { borderStyle: "round", borderColor: "cyan_FOR_SUBAGENTS_ONLY", flexDirection: "column", paddingX: 1, paddingY: 1 },
                t1,
                t2,
                t3));
        $[7] = t1;
        $[8] = t2;
        $[9] = t3;
        $[10] = t4;
    }
    else {
        t4 = $[10];
    }
    return t4;
}
/**
 * Try to parse and render a task assignment message from raw content.
 */
export function tryRenderTaskAssignmentMessage(content) {
    const assignment = isTaskAssignment(content);
    if (assignment) {
        return React.createElement(TaskAssignmentDisplay, { assignment: assignment });
    }
    return null;
}
/**
 * Get a brief summary text for a task assignment message.
 */
export function getTaskAssignmentSummary(content) {
    const assignment = isTaskAssignment(content);
    if (assignment) {
        return `[Task Assigned] #${assignment.taskId} - ${assignment.subject}`;
    }
    return null;
}
//# sourceMappingURL=TaskAssignmentMessage.js.map