import { c as _c } from "react-compiler-runtime";
import React from 'react';
import { Box, Text } from '../../ink.js';
import { getPlatform } from '../../utils/platform.js';
export function SandboxDependenciesTab(t0) {
    const $ = _c(24);
    const { depCheck } = t0;
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = getPlatform();
        $[0] = t1;
    }
    else {
        t1 = $[0];
    }
    const platform = t1;
    const isMac = platform === "macos";
    let t2;
    if ($[1] !== depCheck.errors) {
        t2 = depCheck.errors.some(_temp);
        $[1] = depCheck.errors;
        $[2] = t2;
    }
    else {
        t2 = $[2];
    }
    const rgMissing = t2;
    let t3;
    if ($[3] !== depCheck.errors) {
        t3 = depCheck.errors.some(_temp2);
        $[3] = depCheck.errors;
        $[4] = t3;
    }
    else {
        t3 = $[4];
    }
    const bwrapMissing = t3;
    let t4;
    if ($[5] !== depCheck.errors) {
        t4 = depCheck.errors.some(_temp3);
        $[5] = depCheck.errors;
        $[6] = t4;
    }
    else {
        t4 = $[6];
    }
    const socatMissing = t4;
    const seccompMissing = depCheck.warnings.length > 0;
    let t5;
    if ($[7] !== bwrapMissing || $[8] !== depCheck.errors || $[9] !== rgMissing || $[10] !== seccompMissing || $[11] !== socatMissing) {
        const otherErrors = depCheck.errors.filter(_temp4);
        const rgInstallHint = isMac ? "brew install ripgrep" : "apt install ripgrep";
        let t6;
        if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
            t6 = isMac && React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, null,
                    "seatbelt: ",
                    React.createElement(Text, { color: "success" }, "built-in (macOS)")));
            $[13] = t6;
        }
        else {
            t6 = $[13];
        }
        let t7;
        let t8;
        if ($[14] !== rgMissing) {
            t7 = React.createElement(Text, null,
                "ripgrep (rg):",
                " ",
                rgMissing ? React.createElement(Text, { color: "error" }, "not found") : React.createElement(Text, { color: "success" }, "found"));
            t8 = rgMissing && React.createElement(Text, { dimColor: true },
                "  ",
                "\u00B7 ",
                rgInstallHint);
            $[14] = rgMissing;
            $[15] = t7;
            $[16] = t8;
        }
        else {
            t7 = $[15];
            t8 = $[16];
        }
        let t9;
        if ($[17] !== t7 || $[18] !== t8) {
            t9 = React.createElement(Box, { flexDirection: "column" },
                t7,
                t8);
            $[17] = t7;
            $[18] = t8;
            $[19] = t9;
        }
        else {
            t9 = $[19];
        }
        let t10;
        if ($[20] !== bwrapMissing || $[21] !== seccompMissing || $[22] !== socatMissing) {
            t10 = !isMac && React.createElement(React.Fragment, null,
                React.createElement(Box, { flexDirection: "column" },
                    React.createElement(Text, null,
                        "bubblewrap (bwrap):",
                        " ",
                        bwrapMissing ? React.createElement(Text, { color: "error" }, "not installed") : React.createElement(Text, { color: "success" }, "installed")),
                    bwrapMissing && React.createElement(Text, { dimColor: true },
                        "  ",
                        "\u00B7 apt install bubblewrap")),
                React.createElement(Box, { flexDirection: "column" },
                    React.createElement(Text, null,
                        "socat:",
                        " ",
                        socatMissing ? React.createElement(Text, { color: "error" }, "not installed") : React.createElement(Text, { color: "success" }, "installed")),
                    socatMissing && React.createElement(Text, { dimColor: true },
                        "  ",
                        "\u00B7 apt install socat")),
                React.createElement(Box, { flexDirection: "column" },
                    React.createElement(Text, null,
                        "seccomp filter:",
                        " ",
                        seccompMissing ? React.createElement(Text, { color: "warning" }, "not installed") : React.createElement(Text, { color: "success" }, "installed"),
                        seccompMissing && React.createElement(Text, { dimColor: true }, " (required to block unix domain sockets)")),
                    seccompMissing && React.createElement(Box, { flexDirection: "column" },
                        React.createElement(Text, { dimColor: true },
                            "  ",
                            "\u00B7 npm install -g @anthropic-ai/sandbox-runtime"),
                        React.createElement(Text, { dimColor: true },
                            "  ",
                            "\u00B7 or copy vendor/seccomp/* from sandbox-runtime and set"),
                        React.createElement(Text, { dimColor: true },
                            "    ",
                            "sandbox.seccomp.bpfPath and applyPath in settings.json"))));
            $[20] = bwrapMissing;
            $[21] = seccompMissing;
            $[22] = socatMissing;
            $[23] = t10;
        }
        else {
            t10 = $[23];
        }
        t5 = React.createElement(Box, { flexDirection: "column", paddingY: 1, gap: 1 },
            t6,
            t9,
            t10,
            otherErrors.map(_temp5));
        $[7] = bwrapMissing;
        $[8] = depCheck.errors;
        $[9] = rgMissing;
        $[10] = seccompMissing;
        $[11] = socatMissing;
        $[12] = t5;
    }
    else {
        t5 = $[12];
    }
    return t5;
}
function _temp5(err) {
    return React.createElement(Text, { key: err, color: "error" }, err);
}
function _temp4(e_2) {
    return !e_2.includes("ripgrep") && !e_2.includes("bwrap") && !e_2.includes("socat");
}
function _temp3(e_1) {
    return e_1.includes("socat");
}
function _temp2(e_0) {
    return e_0.includes("bwrap");
}
function _temp(e) {
    return e.includes("ripgrep");
}
//# sourceMappingURL=SandboxDependenciesTab.js.map