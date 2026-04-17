import * as React from 'react';
export const call = async (onDone, context) => {
    const { DiffDialog } = await import('../../components/diff/DiffDialog.js');
    return <DiffDialog messages={context.messages} onDone={onDone}/>;
};
//# sourceMappingURL=diff.js.map