import { c as _c } from "react-compiler-runtime";
import { Link, Text } from '../ink.js';
export function MCPServerDialogCopy() {
    const $ = _c(1);
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = React.createElement(Text, null,
            "MCP servers may execute code or access system resources. All tool calls require approval. Learn more in the",
            " ",
            React.createElement(Link, { url: "https://code.claude.com/docs/en/mcp" }, "MCP documentation"),
            ".");
        $[0] = t0;
    }
    else {
        t0 = $[0];
    }
    return t0;
}
//# sourceMappingURL=MCPServerDialogCopy.js.map