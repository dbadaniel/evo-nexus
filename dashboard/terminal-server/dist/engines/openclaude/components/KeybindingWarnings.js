import { c as _c } from "react-compiler-runtime";
import React from 'react';
import { Box, Text } from '../ink.js';
import { getCachedKeybindingWarnings, getKeybindingsPath, isKeybindingCustomizationEnabled } from '../keybindings/loadUserBindings.js';
/**
 * Displays keybinding validation warnings in the UI.
 * Similar to McpParsingWarnings, this provides persistent visibility
 * of configuration issues.
 *
 * Only shown when keybinding customization is enabled (ant users + feature gate).
 */
export function KeybindingWarnings() {
    const $ = _c(2);
    if (!isKeybindingCustomizationEnabled()) {
        return null;
    }
    let t0;
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = Symbol.for("react.early_return_sentinel");
        bb0: {
            const warnings = getCachedKeybindingWarnings();
            if (warnings.length === 0) {
                t1 = null;
                break bb0;
            }
            const errors = warnings.filter(_temp);
            const warns = warnings.filter(_temp2);
            t0 = React.createElement(Box, { flexDirection: "column", marginTop: 1, marginBottom: 1 },
                React.createElement(Text, { bold: true, color: errors.length > 0 ? "error" : "warning" }, "Keybinding Configuration Issues"),
                React.createElement(Box, null,
                    React.createElement(Text, { dimColor: true }, "Location: "),
                    React.createElement(Text, { dimColor: true }, getKeybindingsPath())),
                React.createElement(Box, { marginLeft: 1, flexDirection: "column", marginTop: 1 },
                    errors.map(_temp3),
                    warns.map(_temp4)));
        }
        $[0] = t0;
        $[1] = t1;
    }
    else {
        t0 = $[0];
        t1 = $[1];
    }
    if (t1 !== Symbol.for("react.early_return_sentinel")) {
        return t1;
    }
    return t0;
}
function _temp4(warning, i_0) {
    return React.createElement(Box, { key: `warning-${i_0}`, flexDirection: "column" },
        React.createElement(Box, null,
            React.createElement(Text, { dimColor: true }, "\u2514 "),
            React.createElement(Text, { color: "warning" }, "[Warning]"),
            React.createElement(Text, { dimColor: true },
                " ",
                warning.message)),
        warning.suggestion && React.createElement(Box, { marginLeft: 3 },
            React.createElement(Text, { dimColor: true },
                "\u2192 ",
                warning.suggestion)));
}
function _temp3(error, i) {
    return React.createElement(Box, { key: `error-${i}`, flexDirection: "column" },
        React.createElement(Box, null,
            React.createElement(Text, { dimColor: true }, "\u2514 "),
            React.createElement(Text, { color: "error" }, "[Error]"),
            React.createElement(Text, { dimColor: true },
                " ",
                error.message)),
        error.suggestion && React.createElement(Box, { marginLeft: 3 },
            React.createElement(Text, { dimColor: true },
                "\u2192 ",
                error.suggestion)));
}
function _temp2(w_0) {
    return w_0.severity === "warning";
}
function _temp(w) {
    return w.severity === "error";
}
//# sourceMappingURL=KeybindingWarnings.js.map