import { c as _c } from "react-compiler-runtime";
import figures from 'figures';
import { Box, Text } from '../ink.js';
import { formatTokens } from '../utils/format.js';
import { StatusIcon } from './design-system/StatusIcon.js';
export function ContextSuggestions(t0) {
    const $ = _c(5);
    const { suggestions } = t0;
    if (suggestions.length === 0) {
        return null;
    }
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = React.createElement(Text, { bold: true }, "Suggestions");
        $[0] = t1;
    }
    else {
        t1 = $[0];
    }
    let t2;
    if ($[1] !== suggestions) {
        t2 = suggestions.map(_temp);
        $[1] = suggestions;
        $[2] = t2;
    }
    else {
        t2 = $[2];
    }
    let t3;
    if ($[3] !== t2) {
        t3 = React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            t1,
            t2);
        $[3] = t2;
        $[4] = t3;
    }
    else {
        t3 = $[4];
    }
    return t3;
}
function _temp(suggestion, i) {
    return React.createElement(Box, { key: i, flexDirection: "column", marginTop: i === 0 ? 0 : 1 },
        React.createElement(Box, null,
            React.createElement(StatusIcon, { status: suggestion.severity, withSpace: true }),
            React.createElement(Text, { bold: true }, suggestion.title),
            suggestion.savingsTokens ? React.createElement(Text, { dimColor: true },
                " ",
                figures.arrowRight,
                " save ~",
                formatTokens(suggestion.savingsTokens)) : null),
        React.createElement(Box, { marginLeft: 2 },
            React.createElement(Text, { dimColor: true }, suggestion.detail)));
}
//# sourceMappingURL=ContextSuggestions.js.map