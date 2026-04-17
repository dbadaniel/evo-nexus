import * as React from 'react';
import { Settings } from '../../components/Settings/Settings.js';
export const call = async (onDone, context) => {
    return <Settings onClose={onDone} context={context} defaultTab="Config"/>;
};
//# sourceMappingURL=config.js.map