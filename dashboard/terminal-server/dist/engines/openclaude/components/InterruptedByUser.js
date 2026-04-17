import { c as _c } from "react-compiler-runtime";
import { Text } from '../ink.js';
export function InterruptedByUser() {
    const $ = _c(1);
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = React.createElement(React.Fragment, null,
            React.createElement(Text, { dimColor: true }, "Interrupted "),
            false ? React.createElement(Text, { dimColor: true }, "\u00B7 [internal] /issue to report a model issue") : React.createElement(Text, { dimColor: true }, "\u00B7 What should Claude do instead?"));
        $[0] = t0;
    }
    else {
        t0 = $[0];
    }
    return t0;
}
//# sourceMappingURL=InterruptedByUser.js.map