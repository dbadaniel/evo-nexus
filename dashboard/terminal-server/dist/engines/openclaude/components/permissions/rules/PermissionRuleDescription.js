import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { Text } from '../../../ink.js';
import { BashTool } from '../../../tools/BashTool/BashTool.js';
export function PermissionRuleDescription(t0) {
    const $ = _c(9);
    const { ruleValue } = t0;
    switch (ruleValue.toolName) {
        case BashTool.name:
            {
                if (ruleValue.ruleContent) {
                    if (ruleValue.ruleContent.endsWith(":*")) {
                        let t1;
                        if ($[0] !== ruleValue.ruleContent) {
                            t1 = ruleValue.ruleContent.slice(0, -2);
                            $[0] = ruleValue.ruleContent;
                            $[1] = t1;
                        }
                        else {
                            t1 = $[1];
                        }
                        let t2;
                        if ($[2] !== t1) {
                            t2 = React.createElement(Text, { dimColor: true },
                                "Any Bash command starting with",
                                " ",
                                React.createElement(Text, { bold: true }, t1));
                            $[2] = t1;
                            $[3] = t2;
                        }
                        else {
                            t2 = $[3];
                        }
                        return t2;
                    }
                    else {
                        let t1;
                        if ($[4] !== ruleValue.ruleContent) {
                            t1 = React.createElement(Text, { dimColor: true },
                                "The Bash command ",
                                React.createElement(Text, { bold: true }, ruleValue.ruleContent));
                            $[4] = ruleValue.ruleContent;
                            $[5] = t1;
                        }
                        else {
                            t1 = $[5];
                        }
                        return t1;
                    }
                }
                else {
                    let t1;
                    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
                        t1 = React.createElement(Text, { dimColor: true }, "Any Bash command");
                        $[6] = t1;
                    }
                    else {
                        t1 = $[6];
                    }
                    return t1;
                }
            }
        default:
            {
                if (!ruleValue.ruleContent) {
                    let t1;
                    if ($[7] !== ruleValue.toolName) {
                        t1 = React.createElement(Text, { dimColor: true },
                            "Any use of the ",
                            React.createElement(Text, { bold: true }, ruleValue.toolName),
                            " tool");
                        $[7] = ruleValue.toolName;
                        $[8] = t1;
                    }
                    else {
                        t1 = $[8];
                    }
                    return t1;
                }
                else {
                    return null;
                }
            }
    }
}
//# sourceMappingURL=PermissionRuleDescription.js.map