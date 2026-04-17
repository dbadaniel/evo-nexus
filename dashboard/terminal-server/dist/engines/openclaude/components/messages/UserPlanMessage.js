import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { Markdown } from '../Markdown.js';
export function UserPlanMessage(t0) {
    const $ = _c(6);
    const { addMargin, planContent } = t0;
    const t1 = addMargin ? 1 : 0;
    let t2;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { bold: true, color: "planMode" }, "Plan to implement"));
        $[0] = t2;
    }
    else {
        t2 = $[0];
    }
    let t3;
    if ($[1] !== planContent) {
        t3 = React.createElement(Markdown, null, planContent);
        $[1] = planContent;
        $[2] = t3;
    }
    else {
        t3 = $[2];
    }
    let t4;
    if ($[3] !== t1 || $[4] !== t3) {
        t4 = React.createElement(Box, { flexDirection: "column", borderStyle: "round", borderColor: "planMode", marginTop: t1, paddingX: 1 },
            t2,
            t3);
        $[3] = t1;
        $[4] = t3;
        $[5] = t4;
    }
    else {
        t4 = $[5];
    }
    return t4;
}
//# sourceMappingURL=UserPlanMessage.js.map