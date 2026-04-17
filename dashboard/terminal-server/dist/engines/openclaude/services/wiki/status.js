import { readdir, stat } from 'fs/promises';
import { getWikiPaths } from './paths.js';
async function pathExists(path) {
    try {
        await stat(path);
        return true;
    }
    catch {
        return false;
    }
}
async function listMarkdownFiles(dir) {
    if (!(await pathExists(dir))) {
        return [];
    }
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
            files.push(...(await listMarkdownFiles(fullPath)));
        }
        else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }
    return files;
}
async function getLastUpdatedAt(pathsToCheck) {
    const mtimes = [];
    for (const path of pathsToCheck) {
        try {
            const info = await stat(path);
            mtimes.push(info.mtimeMs);
        }
        catch {
            continue;
        }
    }
    if (mtimes.length === 0) {
        return null;
    }
    return new Date(Math.max(...mtimes)).toISOString();
}
export async function getWikiStatus(cwd) {
    const paths = getWikiPaths(cwd);
    const [hasRoot, hasSchema, hasIndex, hasLog, pages, sources] = await Promise.all([
        pathExists(paths.root),
        pathExists(paths.schemaFile),
        pathExists(paths.indexFile),
        pathExists(paths.logFile),
        listMarkdownFiles(paths.pagesDir),
        listMarkdownFiles(paths.sourcesDir),
    ]);
    return {
        initialized: hasRoot && hasSchema && hasIndex && hasLog,
        root: paths.root,
        pageCount: pages.length,
        sourceCount: sources.length,
        hasSchema,
        hasIndex,
        hasLog,
        lastUpdatedAt: await getLastUpdatedAt([
            paths.schemaFile,
            paths.indexFile,
            paths.logFile,
            ...pages,
            ...sources,
        ]),
    };
}
//# sourceMappingURL=status.js.map