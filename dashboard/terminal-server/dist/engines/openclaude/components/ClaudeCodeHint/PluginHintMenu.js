import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { Select } from '../CustomSelect/select.js';
import { PermissionDialog } from '../permissions/PermissionDialog.js';
const AUTO_DISMISS_MS = 30_000;
export function PluginHintMenu({ pluginName, pluginDescription, marketplaceName, sourceCommand, onResponse }) {
    const onResponseRef = React.useRef(onResponse);
    onResponseRef.current = onResponse;
    React.useEffect(() => {
        const timeoutId = setTimeout(ref => ref.current('no'), AUTO_DISMISS_MS, onResponseRef);
        return () => clearTimeout(timeoutId);
    }, []);
    function onSelect(value) {
        switch (value) {
            case 'yes':
                onResponse('yes');
                break;
            case 'disable':
                onResponse('disable');
                break;
            default:
                onResponse('no');
        }
    }
    const options = [{
            label: React.createElement(Text, null,
                "Yes, install ",
                React.createElement(Text, { bold: true }, pluginName)),
            value: 'yes'
        }, {
            label: 'No',
            value: 'no'
        }, {
            label: "No, and don't show plugin installation hints again",
            value: 'disable'
        }];
    return React.createElement(PermissionDialog, { title: "Plugin Recommendation" },
        React.createElement(Box, { flexDirection: "column", paddingX: 2, paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { dimColor: true },
                    "The ",
                    React.createElement(Text, { bold: true }, sourceCommand),
                    " command suggests installing a plugin.")),
            React.createElement(Box, null,
                React.createElement(Text, { dimColor: true }, "Plugin:"),
                React.createElement(Text, null,
                    " ",
                    pluginName)),
            React.createElement(Box, null,
                React.createElement(Text, { dimColor: true }, "Marketplace:"),
                React.createElement(Text, null,
                    " ",
                    marketplaceName)),
            pluginDescription && React.createElement(Box, null,
                React.createElement(Text, { dimColor: true }, pluginDescription)),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, null, "Would you like to install it?")),
            React.createElement(Box, null,
                React.createElement(Select, { options: options, onChange: onSelect, onCancel: () => onResponse('no') }))));
}
//# sourceMappingURL=PluginHintMenu.js.map