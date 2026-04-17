import React from 'react';
import { DesktopHandoff } from '../../components/DesktopHandoff.js';
export async function call(onDone) {
    return React.createElement(DesktopHandoff, { onDone: onDone });
}
//# sourceMappingURL=desktop.js.map