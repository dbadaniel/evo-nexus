import { c as _c } from "react-compiler-runtime";
/**
 * Miscellaneous subcommand handlers — extracted from main.tsx for lazy loading.
 * setup-token, doctor, install
 */
/* eslint-disable custom-rules/no-process-exit -- CLI subcommand handlers intentionally exit */
import { cwd } from 'process';
import React from 'react';
import { WelcomeV2 } from '../../components/LogoV2/WelcomeV2.js';
import { useManagePlugins } from '../../hooks/useManagePlugins.js';
import { Box, Text } from '../../ink.js';
import { KeybindingSetup } from '../../keybindings/KeybindingProviderSetup.js';
import { logEvent } from '../../services/analytics/index.js';
import { MCPConnectionManager } from '../../services/mcp/MCPConnectionManager.js';
import { AppStateProvider } from '../../state/AppState.js';
import { onChangeAppState } from '../../state/onChangeAppState.js';
import { isAnthropicAuthEnabled } from '../../utils/auth.js';
export async function setupTokenHandler(root) {
    logEvent('tengu_setup_token_command', {});
    const showAuthWarning = !isAnthropicAuthEnabled();
    const { ConsoleOAuthFlow } = await import('../../components/ConsoleOAuthFlow.js');
    await new Promise(resolve => {
        root.render(React.createElement(AppStateProvider, { onChangeAppState: onChangeAppState },
            React.createElement(KeybindingSetup, null,
                React.createElement(Box, { flexDirection: "column", gap: 1 },
                    React.createElement(WelcomeV2, null),
                    showAuthWarning && React.createElement(Box, { flexDirection: "column" },
                        React.createElement(Text, { color: "warning" }, "Warning: You already have authentication configured via environment variable or API key helper."),
                        React.createElement(Text, { color: "warning" }, "The setup-token command will create a new OAuth token which you can use instead.")),
                    React.createElement(ConsoleOAuthFlow, { onDone: () => {
                            void resolve();
                        }, mode: "setup-token", startingMessage: "This will guide you through long-lived (1-year) auth token setup for your Claude account. Claude subscription required." })))));
    });
    root.unmount();
    process.exit(0);
}
// DoctorWithPlugins wrapper + doctor handler
const DoctorLazy = React.lazy(() => import('../../screens/Doctor.js').then(m => ({
    default: m.Doctor
})));
function DoctorWithPlugins(t0) {
    const $ = _c(2);
    const { onDone } = t0;
    useManagePlugins();
    let t1;
    if ($[0] !== onDone) {
        t1 = React.createElement(React.Suspense, { fallback: null },
            React.createElement(DoctorLazy, { onDone: onDone }));
        $[0] = onDone;
        $[1] = t1;
    }
    else {
        t1 = $[1];
    }
    return t1;
}
export async function doctorHandler(root) {
    logEvent('tengu_doctor_command', {});
    await new Promise(resolve => {
        root.render(React.createElement(AppStateProvider, null,
            React.createElement(KeybindingSetup, null,
                React.createElement(MCPConnectionManager, { dynamicMcpConfig: undefined, isStrictMcpConfig: false },
                    React.createElement(DoctorWithPlugins, { onDone: () => {
                            void resolve();
                        } })))));
    });
    root.unmount();
    process.exit(0);
}
// install handler
export async function installHandler(target, options) {
    const { setup } = await import('../../setup.js');
    await setup(cwd(), 'default', false, false, undefined, false);
    const { install } = await import('../../commands/install.js');
    await new Promise(resolve => {
        const args = [];
        if (target)
            args.push(target);
        if (options.force)
            args.push('--force');
        void install.call(result => {
            void resolve();
            process.exit(result.includes('failed') ? 1 : 0);
        }, {}, args);
    });
}
//# sourceMappingURL=util.js.map