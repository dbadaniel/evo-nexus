import * as React from 'react';
import { SkillsMenu } from '../../components/skills/SkillsMenu.js';
export async function call(onDone, context) {
    return <SkillsMenu onExit={onDone} commands={context.options.commands}/>;
}
//# sourceMappingURL=skills.js.map