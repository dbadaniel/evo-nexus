import { c as _c } from "react-compiler-runtime";
import React from 'react';
import { Box, Text } from '../../ink.js';
export function SuccessStep(t0) {
    const $ = _c(21);
    const { secretExists, useExistingSecret, secretName, skipWorkflow: t1 } = t0;
    const skipWorkflow = t1 === undefined ? false : t1;
    let t2;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { bold: true }, "Install GitHub App"),
            React.createElement(Text, { dimColor: true }, "Success"));
        $[0] = t2;
    }
    else {
        t2 = $[0];
    }
    let t3;
    if ($[1] !== skipWorkflow) {
        t3 = !skipWorkflow && React.createElement(Text, { color: "success" }, "\u2713 GitHub Actions workflow created!");
        $[1] = skipWorkflow;
        $[2] = t3;
    }
    else {
        t3 = $[2];
    }
    let t4;
    if ($[3] !== secretExists || $[4] !== useExistingSecret) {
        t4 = secretExists && useExistingSecret && React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "success" }, "\u2713 Using existing ANTHROPIC_API_KEY secret"));
        $[3] = secretExists;
        $[4] = useExistingSecret;
        $[5] = t4;
    }
    else {
        t4 = $[5];
    }
    let t5;
    if ($[6] !== secretExists || $[7] !== secretName || $[8] !== useExistingSecret) {
        t5 = (!secretExists || !useExistingSecret) && React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "success" },
                "\u2713 API key saved as ",
                secretName,
                " secret"));
        $[6] = secretExists;
        $[7] = secretName;
        $[8] = useExistingSecret;
        $[9] = t5;
    }
    else {
        t5 = $[9];
    }
    let t6;
    if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, null, "Next steps:"));
        $[10] = t6;
    }
    else {
        t6 = $[10];
    }
    let t7;
    if ($[11] !== skipWorkflow) {
        t7 = skipWorkflow ? React.createElement(React.Fragment, null,
            React.createElement(Text, null, "1. Install the Claude GitHub App if you haven't already"),
            React.createElement(Text, null, "2. Your workflow file was kept unchanged"),
            React.createElement(Text, null, "3. API key is configured and ready to use")) : React.createElement(React.Fragment, null,
            React.createElement(Text, null, "1. A pre-filled PR page has been created"),
            React.createElement(Text, null, "2. Install the Claude GitHub App if you haven't already"),
            React.createElement(Text, null, "3. Merge the PR to enable Claude PR assistance"));
        $[11] = skipWorkflow;
        $[12] = t7;
    }
    else {
        t7 = $[12];
    }
    let t8;
    if ($[13] !== t3 || $[14] !== t4 || $[15] !== t5 || $[16] !== t7) {
        t8 = React.createElement(Box, { flexDirection: "column", borderStyle: "round", paddingX: 1 },
            t2,
            t3,
            t4,
            t5,
            t6,
            t7);
        $[13] = t3;
        $[14] = t4;
        $[15] = t5;
        $[16] = t7;
        $[17] = t8;
    }
    else {
        t8 = $[17];
    }
    let t9;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = React.createElement(Box, { marginLeft: 3 },
            React.createElement(Text, { dimColor: true }, "Press any key to exit"));
        $[18] = t9;
    }
    else {
        t9 = $[18];
    }
    let t10;
    if ($[19] !== t8) {
        t10 = React.createElement(React.Fragment, null,
            t8,
            t9);
        $[19] = t8;
        $[20] = t10;
    }
    else {
        t10 = $[20];
    }
    return t10;
}
//# sourceMappingURL=SuccessStep.js.map