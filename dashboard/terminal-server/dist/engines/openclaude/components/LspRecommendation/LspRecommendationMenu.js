import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { Select } from '../CustomSelect/select.js';
import { PermissionDialog } from '../permissions/PermissionDialog.js';
const AUTO_DISMISS_MS = 30_000;
export function LspRecommendationMenu({ pluginName, pluginDescription, fileExtension, onResponse }) {
    // Use ref to avoid timer reset when onResponse changes
    const onResponseRef = React.useRef(onResponse);
    onResponseRef.current = onResponse;
    // 30-second auto-dismiss timer - counts as ignored (no)
    React.useEffect(() => {
        const timeoutId = setTimeout(ref => ref.current('no'), AUTO_DISMISS_MS, onResponseRef);
        return () => clearTimeout(timeoutId);
    }, []);
    function onSelect(value) {
        switch (value) {
            case 'yes':
                onResponse('yes');
                break;
            case 'no':
                onResponse('no');
                break;
            case 'never':
                onResponse('never');
                break;
            case 'disable':
                onResponse('disable');
                break;
        }
    }
    const options = [{
            label: React.createElement(Text, null,
                "Yes, install ",
                React.createElement(Text, { bold: true }, pluginName)),
            value: 'yes'
        }, {
            label: 'No, not now',
            value: 'no'
        }, {
            label: React.createElement(Text, null,
                "Never for ",
                React.createElement(Text, { bold: true }, pluginName)),
            value: 'never'
        }, {
            label: 'Disable all LSP recommendations',
            value: 'disable'
        }];
    return React.createElement(PermissionDialog, { title: "LSP Plugin Recommendation" },
        React.createElement(Box, { flexDirection: "column", paddingX: 2, paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { dimColor: true }, "LSP provides code intelligence like go-to-definition and error checking")),
            React.createElement(Box, null,
                React.createElement(Text, { dimColor: true }, "Plugin:"),
                React.createElement(Text, null,
                    " ",
                    pluginName)),
            pluginDescription && React.createElement(Box, null,
                React.createElement(Text, { dimColor: true }, pluginDescription)),
            React.createElement(Box, null,
                React.createElement(Text, { dimColor: true }, "Triggered by:"),
                React.createElement(Text, null,
                    " ",
                    fileExtension,
                    " files")),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, null, "Would you like to install this LSP plugin?")),
            React.createElement(Box, null,
                React.createElement(Select, { options: options, onChange: onSelect, onCancel: () => onResponse('no') }))));
}
//# sourceMappingURL=LspRecommendationMenu.js.map