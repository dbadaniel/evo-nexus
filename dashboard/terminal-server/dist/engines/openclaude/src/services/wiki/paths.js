import { join } from 'path';
export const OPENCLAUDE_DIRNAME = '.openclaude';
export const WIKI_DIRNAME = 'wiki';
export function getWikiPaths(cwd) {
    const root = join(cwd, OPENCLAUDE_DIRNAME, WIKI_DIRNAME);
    return {
        root,
        pagesDir: join(root, 'pages'),
        sourcesDir: join(root, 'sources'),
        schemaFile: join(root, 'schema.md'),
        indexFile: join(root, 'index.md'),
        logFile: join(root, 'log.md'),
    };
}
//# sourceMappingURL=paths.js.map