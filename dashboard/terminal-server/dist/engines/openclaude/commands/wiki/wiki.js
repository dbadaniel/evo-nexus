import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js';
import { ingestLocalWikiSource } from '../../services/wiki/ingest.js';
import { initializeWiki } from '../../services/wiki/init.js';
import { getWikiStatus } from '../../services/wiki/status.js';
import { getCwd } from '../../utils/cwd.js';
function renderHelp() {
    return `Usage: /wiki [init|status|ingest <path>]

Manage the OpenClaude project wiki stored in .openclaude/wiki.

Commands:
  /wiki init    Initialize the wiki structure in the current project
  /wiki status  Show wiki status and page/source counts
  /wiki ingest  Ingest a local file into wiki sources

Examples:
  /wiki init
  /wiki status
  /wiki ingest README.md`;
}
function formatInitResult(result) {
    const lines = [`Initialized OpenClaude wiki at ${result.root}`];
    if (result.alreadyExisted) {
        lines.push('', 'Wiki already existed. No new files were created.');
        return lines.join('\n');
    }
    if (result.createdFiles.length > 0) {
        lines.push('', 'Created files:');
        for (const file of result.createdFiles) {
            lines.push(`- ${file}`);
        }
    }
    return lines.join('\n');
}
function formatStatus(status) {
    if (!status.initialized) {
        return `OpenClaude wiki is not initialized in this project.\n\nRun /wiki init to create ${status.root}.`;
    }
    return [
        'OpenClaude wiki status',
        '',
        `Root: ${status.root}`,
        `Pages: ${status.pageCount}`,
        `Sources: ${status.sourceCount}`,
        `Schema: ${status.hasSchema ? 'present' : 'missing'}`,
        `Index: ${status.hasIndex ? 'present' : 'missing'}`,
        `Log: ${status.hasLog ? 'present' : 'missing'}`,
        `Last updated: ${status.lastUpdatedAt ?? 'unknown'}`,
    ].join('\n');
}
function formatIngestResult(result) {
    return [
        `Ingested ${result.sourceFile} into the OpenClaude wiki.`,
        '',
        `Title: ${result.title}`,
        `Source note: ${result.sourceNote}`,
        `Summary: ${result.summary}`,
    ].join('\n');
}
async function runWikiCommand(onDone, args) {
    const cwd = getCwd();
    const normalized = args.trim().toLowerCase();
    if (COMMON_HELP_ARGS.includes(normalized) || COMMON_INFO_ARGS.includes(normalized)) {
        onDone(renderHelp(), { display: 'system' });
        return;
    }
    if (!normalized || normalized === 'status') {
        onDone(formatStatus(await getWikiStatus(cwd)), { display: 'system' });
        return;
    }
    if (normalized === 'init') {
        onDone(formatInitResult(await initializeWiki(cwd)), { display: 'system' });
        return;
    }
    if (normalized.startsWith('ingest')) {
        const pathArg = args.trim().slice('ingest'.length).trim();
        if (!pathArg) {
            onDone('Usage: /wiki ingest <local-file-path>', { display: 'system' });
            return;
        }
        onDone(formatIngestResult(await ingestLocalWikiSource(cwd, pathArg)), {
            display: 'system',
        });
        return;
    }
    onDone(`Unknown wiki subcommand: ${args.trim()}\n\n${renderHelp()}`, {
        display: 'system',
    });
}
export const call = async (onDone, _context, args) => {
    await runWikiCommand(onDone, args ?? '');
    return null;
};
//# sourceMappingURL=wiki.js.map