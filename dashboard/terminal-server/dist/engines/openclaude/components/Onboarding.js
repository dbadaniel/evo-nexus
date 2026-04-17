import { c as _c } from "react-compiler-runtime";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { logEvent } from 'src/services/analytics/index.js';
import { setupTerminal, shouldOfferTerminalSetup } from '../commands/terminalSetup/terminalSetup.js';
import { useExitOnCtrlCDWithKeybindings } from '../hooks/useExitOnCtrlCDWithKeybindings.js';
import { Box, Link, Newline, Text, useTheme } from '../ink.js';
import { useKeybindings } from '../keybindings/useKeybinding.js';
import { isAnthropicAuthEnabled } from '../utils/auth.js';
import { normalizeApiKeyForConfig } from '../utils/authPortable.js';
import { getCustomApiKeyStatus } from '../utils/config.js';
import { env } from '../utils/env.js';
import { isRunningOnHomespace } from '../utils/envUtils.js';
import { PreflightStep } from '../utils/preflightChecks.js';
import { ApproveApiKey } from './ApproveApiKey.js';
import { ConsoleOAuthFlow } from './ConsoleOAuthFlow.js';
import { Select } from './CustomSelect/select.js';
import { WelcomeV2 } from './LogoV2/WelcomeV2.js';
import { PressEnterToContinue } from './PressEnterToContinue.js';
import { ThemePicker } from './ThemePicker.js';
import { OrderedList } from './ui/OrderedList.js';
export function Onboarding({ onDone }) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [skipOAuth, setSkipOAuth] = useState(false);
    const [oauthEnabled] = useState(() => isAnthropicAuthEnabled());
    const [theme, setTheme] = useTheme();
    useEffect(() => {
        logEvent('tengu_began_setup', {
            oauthEnabled
        });
    }, [oauthEnabled]);
    function goToNextStep() {
        if (currentStepIndex < steps.length - 1) {
            const nextIndex = currentStepIndex + 1;
            setCurrentStepIndex(nextIndex);
            logEvent('tengu_onboarding_step', {
                oauthEnabled,
                stepId: steps[nextIndex]?.id
            });
        }
        else {
            onDone();
        }
    }
    function handleThemeSelection(newTheme) {
        setTheme(newTheme);
        goToNextStep();
    }
    const exitState = useExitOnCtrlCDWithKeybindings();
    // Define all onboarding steps
    const themeStep = React.createElement(Box, { marginX: 1 },
        React.createElement(ThemePicker, { onThemeSelect: handleThemeSelection, showIntroText: true, helpText: "To change this later, run /theme", hideEscToCancel: true, skipExitHandling: true }));
    const securityStep = React.createElement(Box, { flexDirection: "column", gap: 1, paddingLeft: 1 },
        React.createElement(Text, { bold: true }, "Security notes:"),
        React.createElement(Box, { flexDirection: "column", width: 70 },
            React.createElement(OrderedList, null,
                React.createElement(OrderedList.Item, null,
                    React.createElement(Text, null, "Claude can make mistakes"),
                    React.createElement(Text, { dimColor: true, wrap: "wrap" },
                        "You should always review Claude's responses, especially when",
                        React.createElement(Newline, null),
                        "running code.",
                        React.createElement(Newline, null))),
                React.createElement(OrderedList.Item, null,
                    React.createElement(Text, null, "Due to prompt injection risks, only use it with code you trust"),
                    React.createElement(Text, { dimColor: true, wrap: "wrap" },
                        "For more details see:",
                        React.createElement(Newline, null),
                        React.createElement(Link, { url: "https://code.claude.com/docs/en/security" }))))),
        React.createElement(PressEnterToContinue, null));
    const preflightStep = React.createElement(PreflightStep, { onSuccess: goToNextStep });
    // Create the steps array - determine which steps to include based on reAuth and oauthEnabled
    const apiKeyNeedingApproval = useMemo(() => {
        // Add API key step if needed
        // On homespace, ANTHROPIC_API_KEY is preserved in process.env for child
        // processes but ignored by Claude Code itself (see auth.ts).
        if (!process.env.ANTHROPIC_API_KEY || isRunningOnHomespace() || !isAnthropicAuthEnabled()) {
            return '';
        }
        const customApiKeyTruncated = normalizeApiKeyForConfig(process.env.ANTHROPIC_API_KEY);
        if (getCustomApiKeyStatus(customApiKeyTruncated) === 'new') {
            return customApiKeyTruncated;
        }
    }, []);
    function handleApiKeyDone(approved) {
        if (approved) {
            setSkipOAuth(true);
        }
        goToNextStep();
    }
    const steps = [];
    if (oauthEnabled) {
        steps.push({
            id: 'preflight',
            component: preflightStep
        });
    }
    steps.push({
        id: 'theme',
        component: themeStep
    });
    if (apiKeyNeedingApproval) {
        steps.push({
            id: 'api-key',
            component: React.createElement(ApproveApiKey, { customApiKeyTruncated: apiKeyNeedingApproval, onDone: handleApiKeyDone })
        });
    }
    if (oauthEnabled) {
        steps.push({
            id: 'oauth',
            component: React.createElement(SkippableStep, { skip: skipOAuth, onSkip: goToNextStep },
                React.createElement(ConsoleOAuthFlow, { onDone: goToNextStep }))
        });
    }
    steps.push({
        id: 'security',
        component: securityStep
    });
    if (shouldOfferTerminalSetup()) {
        steps.push({
            id: 'terminal-setup',
            component: React.createElement(Box, { flexDirection: "column", gap: 1, paddingLeft: 1 },
                React.createElement(Text, { bold: true }, "Use Claude Code's terminal setup?"),
                React.createElement(Box, { flexDirection: "column", width: 70, gap: 1 },
                    React.createElement(Text, null,
                        "For the optimal coding experience, enable the recommended settings",
                        React.createElement(Newline, null),
                        "for your terminal:",
                        ' ',
                        env.terminal === 'Apple_Terminal' ? 'Option+Enter for newlines and visual bell' : 'Shift+Enter for newlines'),
                    React.createElement(Select, { options: [{
                                label: 'Yes, use recommended settings',
                                value: 'install'
                            }, {
                                label: 'No, maybe later with /terminal-setup',
                                value: 'no'
                            }], onChange: value => {
                            if (value === 'install') {
                                // Errors already logged in setupTerminal, just swallow and proceed
                                void setupTerminal(theme).catch(() => { }).finally(goToNextStep);
                            }
                            else {
                                goToNextStep();
                            }
                        }, onCancel: () => goToNextStep() }),
                    React.createElement(Text, { dimColor: true }, exitState.pending ? React.createElement(React.Fragment, null,
                        "Press ",
                        exitState.keyName,
                        " again to exit") : React.createElement(React.Fragment, null, "Enter to confirm \u00B7 Esc to skip"))))
        });
    }
    const currentStep = steps[currentStepIndex];
    // Handle Enter on security step and Escape on terminal-setup step
    // Dependencies match what goToNextStep uses internally
    const handleSecurityContinue = useCallback(() => {
        if (currentStepIndex === steps.length - 1) {
            onDone();
        }
        else {
            goToNextStep();
        }
    }, [currentStepIndex, steps.length, oauthEnabled, onDone]);
    const handleTerminalSetupSkip = useCallback(() => {
        goToNextStep();
    }, [currentStepIndex, steps.length, oauthEnabled, onDone]);
    useKeybindings({
        'confirm:yes': handleSecurityContinue
    }, {
        context: 'Confirmation',
        isActive: currentStep?.id === 'security'
    });
    useKeybindings({
        'confirm:no': handleTerminalSetupSkip
    }, {
        context: 'Confirmation',
        isActive: currentStep?.id === 'terminal-setup'
    });
    return React.createElement(Box, { flexDirection: "column" },
        React.createElement(WelcomeV2, null),
        React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            currentStep?.component,
            exitState.pending && React.createElement(Box, { padding: 1 },
                React.createElement(Text, { dimColor: true },
                    "Press ",
                    exitState.keyName,
                    " again to exit"))));
}
export function SkippableStep(t0) {
    const $ = _c(4);
    const { skip, onSkip, children } = t0;
    let t1;
    let t2;
    if ($[0] !== onSkip || $[1] !== skip) {
        t1 = () => {
            if (skip) {
                onSkip();
            }
        };
        t2 = [skip, onSkip];
        $[0] = onSkip;
        $[1] = skip;
        $[2] = t1;
        $[3] = t2;
    }
    else {
        t1 = $[2];
        t2 = $[3];
    }
    useEffect(t1, t2);
    if (skip) {
        return null;
    }
    return children;
}
//# sourceMappingURL=Onboarding.js.map