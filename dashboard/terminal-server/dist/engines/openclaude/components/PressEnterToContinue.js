import { c as _c } from "react-compiler-runtime";
import { Text } from '../ink.js';
export function PressEnterToContinue() {
    const $ = _c(1);
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = React.createElement(Text, { color: "permission" },
            "Press ",
            React.createElement(Text, { bold: true }, "Enter"),
            " to continue\u2026");
        $[0] = t0;
    }
    else {
        t0 = $[0];
    }
    return t0;
}
//# sourceMappingURL=PressEnterToContinue.js.map