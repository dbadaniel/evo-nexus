import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { getAgentName, getTeammateColor, getTeamName } from '../../utils/teammate.js';
import { Spinner } from '../Spinner.js';
import { WorkerBadge } from './WorkerBadge.js';
/**
 * Visual indicator shown on workers while waiting for leader to approve a permission request.
 * Displays the pending tool with a spinner and information about what's being requested.
 */
export function WorkerPendingPermission(t0) {
    const $ = _c(15);
    const { toolName, description } = t0;
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = getTeamName();
        $[0] = t1;
    }
    else {
        t1 = $[0];
    }
    const teamName = t1;
    let t2;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = getAgentName();
        $[1] = t2;
    }
    else {
        t2 = $[1];
    }
    const agentName = t2;
    let t3;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = getTeammateColor();
        $[2] = t3;
    }
    else {
        t3 = $[2];
    }
    const agentColor = t3;
    let t4;
    let t5;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = React.createElement(Box, { marginBottom: 1 },
            React.createElement(Spinner, null),
            React.createElement(Text, { color: "warning", bold: true },
                " ",
                "Waiting for team lead approval"));
        t5 = agentName && agentColor && React.createElement(Box, { marginBottom: 1 },
            React.createElement(WorkerBadge, { name: agentName, color: agentColor }));
        $[3] = t4;
        $[4] = t5;
    }
    else {
        t4 = $[3];
        t5 = $[4];
    }
    let t6;
    if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = React.createElement(Text, { dimColor: true }, "Tool: ");
        $[5] = t6;
    }
    else {
        t6 = $[5];
    }
    let t7;
    if ($[6] !== toolName) {
        t7 = React.createElement(Box, null,
            t6,
            React.createElement(Text, null, toolName));
        $[6] = toolName;
        $[7] = t7;
    }
    else {
        t7 = $[7];
    }
    let t8;
    if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = React.createElement(Text, { dimColor: true }, "Action: ");
        $[8] = t8;
    }
    else {
        t8 = $[8];
    }
    let t9;
    if ($[9] !== description) {
        t9 = React.createElement(Box, null,
            t8,
            React.createElement(Text, null, description));
        $[9] = description;
        $[10] = t9;
    }
    else {
        t9 = $[10];
    }
    let t10;
    if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
        t10 = teamName && React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { dimColor: true },
                "Permission request sent to team ",
                "\"",
                teamName,
                "\"",
                " leader"));
        $[11] = t10;
    }
    else {
        t10 = $[11];
    }
    let t11;
    if ($[12] !== t7 || $[13] !== t9) {
        t11 = React.createElement(Box, { flexDirection: "column", borderStyle: "round", borderColor: "warning", paddingX: 1 },
            t4,
            t5,
            t7,
            t9,
            t10);
        $[12] = t7;
        $[13] = t9;
        $[14] = t11;
    }
    else {
        t11 = $[14];
    }
    return t11;
}
//# sourceMappingURL=WorkerPendingPermission.js.map