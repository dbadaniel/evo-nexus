import * as React from 'react';
import { RemoteEnvironmentDialog } from '../../components/RemoteEnvironmentDialog.js';
export async function call(onDone) {
    return React.createElement(RemoteEnvironmentDialog, { onDone: onDone });
}
//# sourceMappingURL=remote-env.js.map