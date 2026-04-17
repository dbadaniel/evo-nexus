import { basename, join } from 'path';
import { findProjectInstructionFilePathInAncestors, isProjectInstructionFileName, PRIMARY_PROJECT_INSTRUCTION_FILE, } from '../../utils/projectInstructions.js';
function isLoadedProjectInstructionFile(file) {
    return (file.type === 'Project' &&
        file.parent === undefined &&
        isProjectInstructionFileName(basename(file.path)));
}
export function getProjectMemoryPathForSelector(existingMemoryFiles, cwd) {
    const loadedProjectInstructionPaths = new Set(existingMemoryFiles
        .filter(isLoadedProjectInstructionFile)
        .map(file => file.path));
    return (findProjectInstructionFilePathInAncestors(cwd, path => loadedProjectInstructionPaths.has(path)) ?? join(cwd, PRIMARY_PROJECT_INSTRUCTION_FILE));
}
//# sourceMappingURL=memoryFileSelectorPaths.js.map