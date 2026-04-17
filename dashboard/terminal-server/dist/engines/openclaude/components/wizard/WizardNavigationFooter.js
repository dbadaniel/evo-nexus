import React from 'react';
import { useExitOnCtrlCDWithKeybindings } from '../../hooks/useExitOnCtrlCDWithKeybindings.js';
import { Box, Text } from '../../ink.js';
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js';
import { Byline } from '../design-system/Byline.js';
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js';
export function WizardNavigationFooter({ instructions = React.createElement(Byline, null,
    React.createElement(KeyboardShortcutHint, { shortcut: "\u2191\u2193", action: "navigate" }),
    React.createElement(KeyboardShortcutHint, { shortcut: "Enter", action: "select" }),
    React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Confirmation", fallback: "Esc", description: "go back" })) }) {
    const exitState = useExitOnCtrlCDWithKeybindings();
    return React.createElement(Box, { marginLeft: 3, marginTop: 1 },
        React.createElement(Text, { dimColor: true }, exitState.pending ? `Press ${exitState.keyName} again to exit` : instructions));
}
//# sourceMappingURL=WizardNavigationFooter.js.map