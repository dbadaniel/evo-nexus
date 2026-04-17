import * as React from 'react';
import { HelpV2 } from '../../components/HelpV2/HelpV2.js';
export const call = async (onDone, { options: { commands } }) => {
    return React.createElement(HelpV2, { commands: commands, onClose: onDone });
};
//# sourceMappingURL=help.js.map