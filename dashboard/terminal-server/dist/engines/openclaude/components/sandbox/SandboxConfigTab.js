import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { SandboxManager, shouldAllowManagedSandboxDomainsOnly } from '../../utils/sandbox/sandbox-adapter.js';
export function SandboxConfigTab() {
    const $ = _c(3);
    const isEnabled = SandboxManager.isSandboxingEnabled();
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        const depCheck = SandboxManager.checkDependencies();
        t0 = depCheck.warnings.length > 0 ? React.createElement(Box, { marginTop: 1, flexDirection: "column" }, depCheck.warnings.map(_temp)) : null;
        $[0] = t0;
    }
    else {
        t0 = $[0];
    }
    const warningsNote = t0;
    if (!isEnabled) {
        let t1;
        if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
            t1 = React.createElement(Box, { flexDirection: "column", paddingY: 1 },
                React.createElement(Text, { color: "subtle" }, "Sandbox is not enabled"),
                warningsNote);
            $[1] = t1;
        }
        else {
            t1 = $[1];
        }
        return t1;
    }
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        const fsReadConfig = SandboxManager.getFsReadConfig();
        const fsWriteConfig = SandboxManager.getFsWriteConfig();
        const networkConfig = SandboxManager.getNetworkRestrictionConfig();
        const allowUnixSockets = SandboxManager.getAllowUnixSockets();
        const excludedCommands = SandboxManager.getExcludedCommands();
        const globPatternWarnings = SandboxManager.getLinuxGlobPatternWarnings();
        t1 = React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { bold: true, color: "permission" }, "Excluded Commands:"),
                React.createElement(Text, { dimColor: true }, excludedCommands.length > 0 ? excludedCommands.join(", ") : "None")),
            fsReadConfig.denyOnly.length > 0 && React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, { bold: true, color: "permission" }, "Filesystem Read Restrictions:"),
                React.createElement(Text, { dimColor: true },
                    "Denied: ",
                    fsReadConfig.denyOnly.join(", ")),
                fsReadConfig.allowWithinDeny && fsReadConfig.allowWithinDeny.length > 0 && React.createElement(Text, { dimColor: true },
                    "Allowed within denied: ",
                    fsReadConfig.allowWithinDeny.join(", "))),
            fsWriteConfig.allowOnly.length > 0 && React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, { bold: true, color: "permission" }, "Filesystem Write Restrictions:"),
                React.createElement(Text, { dimColor: true },
                    "Allowed: ",
                    fsWriteConfig.allowOnly.join(", ")),
                fsWriteConfig.denyWithinAllow.length > 0 && React.createElement(Text, { dimColor: true },
                    "Denied within allowed: ",
                    fsWriteConfig.denyWithinAllow.join(", "))),
            (networkConfig.allowedHosts && networkConfig.allowedHosts.length > 0 || networkConfig.deniedHosts && networkConfig.deniedHosts.length > 0) && React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, { bold: true, color: "permission" },
                    "Network Restrictions",
                    shouldAllowManagedSandboxDomainsOnly() ? " (Managed)" : "",
                    ":"),
                networkConfig.allowedHosts && networkConfig.allowedHosts.length > 0 && React.createElement(Text, { dimColor: true },
                    "Allowed: ",
                    networkConfig.allowedHosts.join(", ")),
                networkConfig.deniedHosts && networkConfig.deniedHosts.length > 0 && React.createElement(Text, { dimColor: true },
                    "Denied: ",
                    networkConfig.deniedHosts.join(", "))),
            allowUnixSockets && allowUnixSockets.length > 0 && React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, { bold: true, color: "permission" }, "Allowed Unix Sockets:"),
                React.createElement(Text, { dimColor: true }, allowUnixSockets.join(", "))),
            globPatternWarnings.length > 0 && React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, { bold: true, color: "warning" }, "\u26A0 Warning: Glob patterns not fully supported on Linux"),
                React.createElement(Text, { dimColor: true },
                    "The following patterns will be ignored:",
                    " ",
                    globPatternWarnings.slice(0, 3).join(", "),
                    globPatternWarnings.length > 3 && ` (${globPatternWarnings.length - 3} more)`)),
            warningsNote);
        $[2] = t1;
    }
    else {
        t1 = $[2];
    }
    return t1;
}
function _temp(w, i) {
    return React.createElement(Text, { key: i, dimColor: true }, w);
}
//# sourceMappingURL=SandboxConfigTab.js.map