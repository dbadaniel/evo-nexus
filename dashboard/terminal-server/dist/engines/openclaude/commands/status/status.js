import * as React from 'react';
import { Settings } from '../../components/Settings/Settings.js';
export async function call(onDone, context) {
    return React.createElement(Settings, { onClose: onDone, context: context, defaultTab: "Status" });
}
//# sourceMappingURL=status.js.map