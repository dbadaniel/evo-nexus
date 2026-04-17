import { c as _c } from "react-compiler-runtime";
import React from 'react';
import { Box, Text } from '../../ink.js';
import { SandboxManager } from '../../utils/sandbox/sandbox-adapter.js';
export function SandboxDoctorSection() {
    const $ = _c(2);
    if (!SandboxManager.isSupportedPlatform()) {
        return null;
    }
    if (!SandboxManager.isSandboxEnabledInSettings()) {
        return null;
    }
    let t0;
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = Symbol.for("react.early_return_sentinel");
        bb0: {
            const depCheck = SandboxManager.checkDependencies();
            const hasErrors = depCheck.errors.length > 0;
            const hasWarnings = depCheck.warnings.length > 0;
            if (!hasErrors && !hasWarnings) {
                t1 = null;
                break bb0;
            }
            const statusColor = hasErrors ? "error" : "warning";
            const statusText = hasErrors ? "Missing dependencies" : "Available (with warnings)";
            t0 = React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { bold: true }, "Sandbox"),
                React.createElement(Text, null,
                    "\u2514 Status: ",
                    React.createElement(Text, { color: statusColor }, statusText)),
                depCheck.errors.map(_temp),
                depCheck.warnings.map(_temp2),
                hasErrors && React.createElement(Text, { dimColor: true }, "\u2514 Run /sandbox for install instructions"));
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
function _temp2(w, i_0) {
    return React.createElement(Text, { key: i_0, color: "warning" },
        "\u2514 ",
        w);
}
function _temp(e, i) {
    return React.createElement(Text, { key: i, color: "error" },
        "\u2514 ",
        e);
}
//# sourceMappingURL=SandboxDoctorSection.js.map