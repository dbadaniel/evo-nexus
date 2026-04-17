import * as React from 'react';
import { BackgroundTasksDialog } from '../../components/tasks/BackgroundTasksDialog.js';
export async function call(onDone, context) {
    return React.createElement(BackgroundTasksDialog, { toolUseContext: context, onDone: onDone });
}
//# sourceMappingURL=tasks.js.map