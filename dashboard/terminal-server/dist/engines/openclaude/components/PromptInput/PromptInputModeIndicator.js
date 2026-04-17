import { c as _c } from "react-compiler-runtime";
import figures from 'figures';
import * as React from 'react';
import { Box, Text } from 'src/ink.js';
import { AGENT_COLOR_TO_THEME_COLOR, AGENT_COLORS } from 'src/tools/AgentTool/agentColorManager.js';
import { getTeammateColor } from 'src/utils/teammate.js';
import { isAgentSwarmsEnabled } from '../../utils/agentSwarmsEnabled.js';
/**
 * Gets the theme color key for the teammate's assigned color.
 * Returns undefined if not a teammate or if the color is invalid.
 */
function getTeammateThemeColor() {
    if (!isAgentSwarmsEnabled()) {
        return undefined;
    }
    const colorName = getTeammateColor();
    if (!colorName) {
        return undefined;
    }
    if (AGENT_COLORS.includes(colorName)) {
        return AGENT_COLOR_TO_THEME_COLOR[colorName];
    }
    return undefined;
}
/**
 * Renders the prompt character (❯).
 * Teammate color overrides the default color when set.
 */
function PromptChar(t0) {
    const $ = _c(3);
    const { isLoading, themeColor } = t0;
    const teammateColor = themeColor;
    const color = teammateColor ?? (false ? "subtle" : undefined);
    let t1;
    if ($[0] !== color || $[1] !== isLoading) {
        t1 = React.createElement(Text, { color: color, dimColor: isLoading },
            figures.pointer,
            "\u00A0");
        $[0] = color;
        $[1] = isLoading;
        $[2] = t1;
    }
    else {
        t1 = $[2];
    }
    return t1;
}
export function PromptInputModeIndicator(t0) {
    const $ = _c(6);
    const { mode, isLoading, viewingAgentName, viewingAgentColor } = t0;
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = getTeammateThemeColor();
        $[0] = t1;
    }
    else {
        t1 = $[0];
    }
    const teammateColor = t1;
    const viewedTeammateThemeColor = viewingAgentColor ? AGENT_COLOR_TO_THEME_COLOR[viewingAgentColor] : undefined;
    let t2;
    if ($[1] !== isLoading || $[2] !== mode || $[3] !== viewedTeammateThemeColor || $[4] !== viewingAgentName) {
        t2 = React.createElement(Box, { alignItems: "flex-start", alignSelf: "flex-start", flexWrap: "nowrap", justifyContent: "flex-start" }, viewingAgentName ? React.createElement(PromptChar, { isLoading: isLoading, themeColor: viewedTeammateThemeColor }) : mode === "bash" ? React.createElement(Text, { color: "bashBorder", dimColor: isLoading }, "!\u00A0") : React.createElement(PromptChar, { isLoading: isLoading, themeColor: isAgentSwarmsEnabled() ? teammateColor : undefined }));
        $[1] = isLoading;
        $[2] = mode;
        $[3] = viewedTeammateThemeColor;
        $[4] = viewingAgentName;
        $[5] = t2;
    }
    else {
        t2 = $[5];
    }
    return t2;
}
//# sourceMappingURL=PromptInputModeIndicator.js.map