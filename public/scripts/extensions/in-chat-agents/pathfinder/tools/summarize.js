import { getTree, createTreeNode, saveTree } from '../tree-store.js';
import { createEntry } from '../entry-manager.js';
import { getWritableBooks, resolveTargetBook, TOOL_NAMES } from '../pathfinder-tool-bridge.js';
import { registerToolAction, registerToolFormatter } from '../../tool-action-registry.js';
import { logToolCallStarted, logToolCallCompleted, logToolCallError } from '../activity-feed.js';
import { setSummaryMemoryCreated } from '../summary-memory-store.js';

const COMPACT_DESCRIPTION = 'Create a scene or event summary with significance level and optional narrative arc.';

export async function createSummaryMemoryEntry(args = {}) {
    const title = String(args.title || '').trim();
    const content = String(args.content || '').trim();
    const arc = String(args.arc || '').trim();
    const significance = String(args.significance || 'medium').trim();
    const bookName = String(args.book || '').trim();

    logToolCallStarted(TOOL_NAMES.SUMMARIZE, { title, arc, bookName });

    if (!title || !content) {
        logToolCallError(TOOL_NAMES.SUMMARIZE, 'Missing title or content');
        throw new Error('"title" and "content" are required.');
    }

    const writableBooks = getWritableBooks();
    const targetBook = resolveTargetBook(bookName, writableBooks);
    if (!targetBook) {
        logToolCallError(TOOL_NAMES.SUMMARIZE, 'No writable lorebooks');
        throw new Error('No Pathfinder-enabled lorebooks available for writing.');
    }

    const summaryTitle = `[Summary] ${title}${arc ? ` — ${arc}` : ''}`;
    const formattedContent = `Significance: ${significance}\n\n${content}`;

    try {
        const result = await createEntry(targetBook, summaryTitle, formattedContent, ['summary', significance.toLowerCase()]);
        setSummaryMemoryCreated({
            title: summaryTitle,
            content,
            significance,
            arc,
            bookName: targetBook,
            uid: result.uid,
        });

        const tree = getTree(targetBook);
        if (tree && arc) {
            let summaryWaypoint = (tree.children || []).find(c => /summar/i.test(c.name));
            if (!summaryWaypoint) {
                summaryWaypoint = createTreeNode('Summaries', 'Event summaries and recaps');
                tree.children.push(summaryWaypoint);
            }

            if (arc) {
                let arcNode = (summaryWaypoint.children || []).find(c => c.name.toLowerCase() === arc.toLowerCase());
                if (!arcNode) {
                    arcNode = createTreeNode(`Arc: ${arc}`, `Narrative arc: ${arc}`);
                    if (!summaryWaypoint.children) summaryWaypoint.children = [];
                    summaryWaypoint.children.push(arcNode);
                }
                if (arcNode.entries && !arcNode.entries.includes(result.uid)) {
                    arcNode.entries.push(result.uid);
                }
            }

            saveTree(targetBook, tree);
        }

        logToolCallCompleted(TOOL_NAMES.SUMMARIZE, `Summarized: ${title}`);
        return {
            title,
            summaryTitle,
            targetBook,
            uid: result.uid,
            significance,
            arc,
        };
    } catch (err) {
        logToolCallError(TOOL_NAMES.SUMMARIZE, err.message);
        throw err;
    }
}

async function summarizeAction(args) {
    try {
        const result = await createSummaryMemoryEntry(args);
        return `📝 Summary "${result.title}" saved in "${result.targetBook}" (UID: ${result.uid}). Significance: ${result.significance}. ${result.arc ? `Filed under arc "${result.arc}".` : ''}`;
    } catch (err) {
        return `❌ Failed to summarize: ${err.message}`;
    }
}

async function summarizeFormatter(args) {
    return `📝 Pathfinder: Writing summary "${args.title || 'untitled'}"...`;
}

export function getDefinition() {
    return {
        name: TOOL_NAMES.SUMMARIZE,
        displayName: 'Pathfinder Summarize',
        description: COMPACT_DESCRIPTION,
        parameters: {
            type: 'object',
            required: ['title', 'content'],
            properties: {
                title: { type: 'string', description: 'Short title for the event/scene' },
                content: { type: 'string', description: 'Full summary of what happened' },
                arc: { type: 'string', description: 'Optional narrative arc name to file this under' },
                significance: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'How important this event is. Default: medium.' },
                book: { type: 'string', description: 'Lorebook name. Omit for default.' },
            },
        },
        actionKey: 'pathfinder_summarize',
        formatMessageKey: 'pathfinder_summarize_fmt',
        shouldRegister: true,
        stealth: false,
        enabled: true,
    };
}

export function registerActions() {
    registerToolAction('pathfinder_summarize', summarizeAction);
    registerToolFormatter('pathfinder_summarize_fmt', summarizeFormatter);
}
