import * as React from 'react';
import { PermissionRuleList } from '../../components/permissions/rules/PermissionRuleList.js';
import { createPermissionRetryMessage } from '../../utils/messages.js';
export const call = async (onDone, context) => {
    return <PermissionRuleList onExit={onDone} onRetryDenials={commands => {
            context.setMessages(prev => [...prev, createPermissionRetryMessage(commands)]);
        }}/>;
};
//# sourceMappingURL=permissions.js.map