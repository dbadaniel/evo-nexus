import { c as _c } from "react-compiler-runtime";
import React, { useEffect, useState } from 'react';
import { Select } from '../../components/CustomSelect/index.js';
import { Pane } from '../../components/design-system/Pane.js';
import { Spinner } from '../../components/Spinner.js';
import { useExitOnCtrlCDWithKeybindings } from '../../hooks/useExitOnCtrlCDWithKeybindings.js';
// eslint-disable-next-line custom-rules/prefer-use-keybindings -- enter to proceed through setup steps
import { Box, Text, useInput } from '../../ink.js';
import { useKeybinding } from '../../keybindings/useKeybinding.js';
import { detectPythonPackageManager, getPythonApiInstructions, installIt2, markIt2SetupComplete, setPreferTmuxOverIterm2, verifyIt2Setup } from './backends/it2Setup.js';
export function It2SetupPrompt(t0) {
    const $ = _c(44);
    const { onDone, tmuxAvailable } = t0;
    const [step, setStep] = useState("initial");
    const [packageManager, setPackageManager] = useState(null);
    const [error, setError] = useState(null);
    const exitState = useExitOnCtrlCDWithKeybindings();
    let t1;
    let t2;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = () => {
            detectPythonPackageManager().then(pm => {
                setPackageManager(pm);
            });
        };
        t2 = [];
        $[0] = t1;
        $[1] = t2;
    }
    else {
        t1 = $[0];
        t2 = $[1];
    }
    useEffect(t1, t2);
    let t3;
    if ($[2] !== onDone) {
        t3 = () => {
            onDone("cancelled");
        };
        $[2] = onDone;
        $[3] = t3;
    }
    else {
        t3 = $[3];
    }
    const handleCancel = t3;
    const t4 = step !== "installing" && step !== "verifying";
    let t5;
    if ($[4] !== t4) {
        t5 = {
            context: "Confirmation",
            isActive: t4
        };
        $[4] = t4;
        $[5] = t5;
    }
    else {
        t5 = $[5];
    }
    useKeybinding("confirm:no", handleCancel, t5);
    let t6;
    if ($[6] !== onDone || $[7] !== step) {
        t6 = (_input, key) => {
            if (step === "api-instructions" && key.return) {
                setStep("verifying");
                verifyIt2Setup().then(result => {
                    if (result.success) {
                        markIt2SetupComplete();
                        setStep("success");
                        setTimeout(onDone, 1500, "installed");
                    }
                    else {
                        setError(result.error || "Verification failed");
                        setStep("failed");
                    }
                });
            }
        };
        $[6] = onDone;
        $[7] = step;
        $[8] = t6;
    }
    else {
        t6 = $[8];
    }
    useInput(t6);
    let t7;
    if ($[9] !== packageManager) {
        t7 = async function handleInstall() {
            if (!packageManager) {
                setError("No Python package manager found (uvx, pipx, or pip)");
                setStep("failed");
                return;
            }
            setStep("installing");
            const result_0 = await installIt2(packageManager);
            if (result_0.success) {
                setStep("api-instructions");
            }
            else {
                setError(result_0.error || "Installation failed");
                setStep("install-failed");
            }
        };
        $[9] = packageManager;
        $[10] = t7;
    }
    else {
        t7 = $[10];
    }
    const handleInstall = t7;
    let t8;
    if ($[11] !== onDone) {
        t8 = function handleUseTmux() {
            setPreferTmuxOverIterm2(true);
            onDone("use-tmux");
        };
        $[11] = onDone;
        $[12] = t8;
    }
    else {
        t8 = $[12];
    }
    const handleUseTmux = t8;
    let T0;
    let T1;
    let t10;
    let t11;
    let t12;
    let t13;
    let t14;
    let t9;
    if ($[13] !== error || $[14] !== handleInstall || $[15] !== handleUseTmux || $[16] !== onDone || $[17] !== packageManager || $[18] !== step || $[19] !== tmuxAvailable) {
        const renderContent = () => {
            switch (step) {
                case "initial":
                    {
                        return renderInitialPrompt();
                    }
                case "installing":
                    {
                        return renderInstalling();
                    }
                case "install-failed":
                    {
                        return renderInstallFailed();
                    }
                case "api-instructions":
                    {
                        return renderApiInstructions();
                    }
                case "verifying":
                    {
                        return renderVerifying();
                    }
                case "success":
                    {
                        return renderSuccess();
                    }
                case "failed":
                    {
                        return renderFailed();
                    }
                default:
                    {
                        return null;
                    }
            }
        };
        function renderInitialPrompt() {
            const options = [{
                    label: "Install it2 now",
                    value: "install",
                    description: packageManager ? `Uses ${packageManager} to install the it2 CLI tool` : "Requires Python (uvx, pipx, or pip)"
                }];
            if (tmuxAvailable) {
                options.push({
                    label: "Use tmux instead",
                    value: "tmux",
                    description: "Opens teammates in a separate tmux session"
                });
            }
            options.push({
                label: "Cancel",
                value: "cancel",
                description: "Skip teammate spawning for now"
            });
            return React.createElement(Box, { flexDirection: "column", gap: 1 },
                React.createElement(Text, null,
                    "To use native iTerm2 split panes for teammates, you need the",
                    " ",
                    React.createElement(Text, { bold: true }, "it2"),
                    " CLI tool."),
                React.createElement(Text, { dimColor: true }, "This enables teammates to appear as split panes within your current window."),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Select, { options: options, onChange: value => {
                            bb61: switch (value) {
                                case "install":
                                    {
                                        handleInstall();
                                        break bb61;
                                    }
                                case "tmux":
                                    {
                                        handleUseTmux();
                                        break bb61;
                                    }
                                case "cancel":
                                    {
                                        onDone("cancelled");
                                    }
                            }
                        }, onCancel: () => onDone("cancelled") })));
        }
        function renderInstalling() {
            return React.createElement(Box, { flexDirection: "column", gap: 1 },
                React.createElement(Box, null,
                    React.createElement(Spinner, null),
                    React.createElement(Text, null,
                        " Installing it2 using ",
                        packageManager,
                        "\u2026")),
                React.createElement(Text, { dimColor: true }, "This may take a moment."));
        }
        function renderInstallFailed() {
            const options_0 = [{
                    label: "Try again",
                    value: "retry",
                    description: "Retry the installation"
                }];
            if (tmuxAvailable) {
                options_0.push({
                    label: "Use tmux instead",
                    value: "tmux",
                    description: "Falls back to tmux for teammate panes"
                });
            }
            options_0.push({
                label: "Cancel",
                value: "cancel",
                description: "Skip teammate spawning for now"
            });
            return React.createElement(Box, { flexDirection: "column", gap: 1 },
                React.createElement(Text, { color: "error" }, "Installation failed"),
                error && React.createElement(Text, { dimColor: true }, error),
                React.createElement(Text, { dimColor: true },
                    "You can try installing manually:",
                    " ",
                    packageManager === "uvx" ? "uv tool install it2" : packageManager === "pipx" ? "pipx install it2" : "pip install --user it2"),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Select, { options: options_0, onChange: value_0 => {
                            bb89: switch (value_0) {
                                case "retry":
                                    {
                                        handleInstall();
                                        break bb89;
                                    }
                                case "tmux":
                                    {
                                        handleUseTmux();
                                        break bb89;
                                    }
                                case "cancel":
                                    {
                                        onDone("cancelled");
                                    }
                            }
                        }, onCancel: () => onDone("cancelled") })));
        }
        function renderApiInstructions() {
            const instructions = getPythonApiInstructions();
            return React.createElement(Box, { flexDirection: "column", gap: 1 },
                React.createElement(Text, { color: "success" }, "\u2713 it2 installed successfully"),
                React.createElement(Box, { flexDirection: "column", marginTop: 1 }, instructions.map(_temp)),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { dimColor: true }, "Press Enter when ready to verify\u2026")));
        }
        function renderVerifying() {
            return React.createElement(Box, null,
                React.createElement(Spinner, null),
                React.createElement(Text, null, " Verifying it2 can communicate with iTerm2\u2026"));
        }
        function renderSuccess() {
            return React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { color: "success" }, "\u2713 iTerm2 split pane support is ready"),
                React.createElement(Text, { dimColor: true }, "Teammates will now appear as split panes."));
        }
        function renderFailed() {
            const options_1 = [{
                    label: "Try again",
                    value: "retry",
                    description: "Verify the connection again"
                }];
            if (tmuxAvailable) {
                options_1.push({
                    label: "Use tmux instead",
                    value: "tmux",
                    description: "Falls back to tmux for teammate panes"
                });
            }
            options_1.push({
                label: "Cancel",
                value: "cancel",
                description: "Skip teammate spawning for now"
            });
            return React.createElement(Box, { flexDirection: "column", gap: 1 },
                React.createElement(Text, { color: "error" }, "Verification failed"),
                error && React.createElement(Text, { dimColor: true }, error),
                React.createElement(Text, null, "Make sure:"),
                React.createElement(Box, { flexDirection: "column", paddingLeft: 2 },
                    React.createElement(Text, null, "\u00B7 Python API is enabled in iTerm2 preferences"),
                    React.createElement(Text, null, "\u00B7 You may need to restart iTerm2 after enabling")),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Select, { options: options_1, onChange: value_1 => {
                            bb115: switch (value_1) {
                                case "retry":
                                    {
                                        setStep("verifying");
                                        verifyIt2Setup().then(result_1 => {
                                            if (result_1.success) {
                                                markIt2SetupComplete();
                                                setStep("success");
                                                setTimeout(onDone, 1500, "installed");
                                            }
                                            else {
                                                setError(result_1.error || "Verification failed");
                                                setStep("failed");
                                            }
                                        });
                                        break bb115;
                                    }
                                case "tmux":
                                    {
                                        handleUseTmux();
                                        break bb115;
                                    }
                                case "cancel":
                                    {
                                        onDone("cancelled");
                                    }
                            }
                        }, onCancel: () => onDone("cancelled") })));
        }
        T1 = Pane;
        t14 = "permission";
        T0 = Box;
        t9 = "column";
        t10 = 1;
        t11 = 1;
        if ($[28] === Symbol.for("react.memo_cache_sentinel")) {
            t12 = React.createElement(Text, { bold: true, color: "permission" }, "iTerm2 Split Pane Setup");
            $[28] = t12;
        }
        else {
            t12 = $[28];
        }
        t13 = renderContent();
        $[13] = error;
        $[14] = handleInstall;
        $[15] = handleUseTmux;
        $[16] = onDone;
        $[17] = packageManager;
        $[18] = step;
        $[19] = tmuxAvailable;
        $[20] = T0;
        $[21] = T1;
        $[22] = t10;
        $[23] = t11;
        $[24] = t12;
        $[25] = t13;
        $[26] = t14;
        $[27] = t9;
    }
    else {
        T0 = $[20];
        T1 = $[21];
        t10 = $[22];
        t11 = $[23];
        t12 = $[24];
        t13 = $[25];
        t14 = $[26];
        t9 = $[27];
    }
    let t15;
    if ($[29] !== exitState || $[30] !== step) {
        t15 = step !== "installing" && step !== "verifying" && step !== "success" && React.createElement(Text, { dimColor: true, italic: true }, exitState.pending ? React.createElement(React.Fragment, null,
            "Press ",
            exitState.keyName,
            " again to exit") : React.createElement(React.Fragment, null, "Esc to cancel"));
        $[29] = exitState;
        $[30] = step;
        $[31] = t15;
    }
    else {
        t15 = $[31];
    }
    let t16;
    if ($[32] !== T0 || $[33] !== t10 || $[34] !== t11 || $[35] !== t12 || $[36] !== t13 || $[37] !== t15 || $[38] !== t9) {
        t16 = React.createElement(T0, { flexDirection: t9, gap: t10, paddingBottom: t11 },
            t12,
            t13,
            t15);
        $[32] = T0;
        $[33] = t10;
        $[34] = t11;
        $[35] = t12;
        $[36] = t13;
        $[37] = t15;
        $[38] = t9;
        $[39] = t16;
    }
    else {
        t16 = $[39];
    }
    let t17;
    if ($[40] !== T1 || $[41] !== t14 || $[42] !== t16) {
        t17 = React.createElement(T1, { color: t14 }, t16);
        $[40] = T1;
        $[41] = t14;
        $[42] = t16;
        $[43] = t17;
    }
    else {
        t17 = $[43];
    }
    return t17;
}
function _temp(line, i) {
    return React.createElement(Text, { key: i }, line);
}
//# sourceMappingURL=It2SetupPrompt.js.map