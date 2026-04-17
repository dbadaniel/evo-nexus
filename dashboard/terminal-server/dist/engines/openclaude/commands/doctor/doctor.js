import React from 'react';
import { Doctor } from '../../screens/Doctor.js';
export const call = (onDone, _context, _args) => {
    return Promise.resolve(React.createElement(Doctor, { onDone: onDone }));
};
//# sourceMappingURL=doctor.js.map