import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { useContext } from 'react';
import { Box, NoSelect, Text } from '../ink.js';
import { Ratchet } from './design-system/Ratchet.js';
export function MessageResponse(t0) {
    const $ = _c(8);
    const { children, height } = t0;
    const isMessageResponse = useContext(MessageResponseContext);
    if (isMessageResponse) {
        return children;
    }
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = React.createElement(NoSelect, { fromLeftEdge: true, flexShrink: 0 },
            React.createElement(Text, { dimColor: true },
                "  ",
                "\u23BF \u00A0"));
        $[0] = t1;
    }
    else {
        t1 = $[0];
    }
    let t2;
    if ($[1] !== children) {
        t2 = React.createElement(Box, { flexShrink: 1, flexGrow: 1 }, children);
        $[1] = children;
        $[2] = t2;
    }
    else {
        t2 = $[2];
    }
    let t3;
    if ($[3] !== height || $[4] !== t2) {
        t3 = React.createElement(MessageResponseProvider, null,
            React.createElement(Box, { flexDirection: "row", height: height, overflowY: "hidden" },
                t1,
                t2));
        $[3] = height;
        $[4] = t2;
        $[5] = t3;
    }
    else {
        t3 = $[5];
    }
    const content = t3;
    if (height !== undefined) {
        return content;
    }
    let t4;
    if ($[6] !== content) {
        t4 = React.createElement(Ratchet, { lock: "offscreen" }, content);
        $[6] = content;
        $[7] = t4;
    }
    else {
        t4 = $[7];
    }
    return t4;
}
// This is a context that is used to determine if the message response
// is rendered as a descendant of another MessageResponse. We use it
// to avoid rendering nested ⎿ characters.
const MessageResponseContext = React.createContext(false);
function MessageResponseProvider(t0) {
    const $ = _c(2);
    const { children } = t0;
    let t1;
    if ($[0] !== children) {
        t1 = React.createElement(MessageResponseContext.Provider, { value: true }, children);
        $[0] = children;
        $[1] = t1;
    }
    else {
        t1 = $[1];
    }
    return t1;
}
//# sourceMappingURL=MessageResponse.js.map