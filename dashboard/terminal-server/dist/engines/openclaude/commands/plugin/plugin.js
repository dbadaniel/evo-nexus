import * as React from 'react';
import { PluginSettings } from './PluginSettings.js';
export async function call(onDone, _context, args) {
    return React.createElement(PluginSettings, { onComplete: onDone, args: args });
}
//# sourceMappingURL=plugin.js.map