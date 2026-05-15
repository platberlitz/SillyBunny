import { forgetEntry } from '../entry-manager.js';
import { getDeletableBooks, getWritableBooks, resolveTargetBook, TOOL_NAMES } from '../pathfinder-tool-bridge.js';
import { registerToolAction, registerToolFormatter } from '../../tool-action-registry.js';
import { logToolCallStarted, logToolCallCompleted, logToolCallError } from '../activity-feed.js';

const COMPACT_DESCRIPTION = 'Disable or delete a lorebook entry that is no longer relevant.';

async function forgetAction(args) {
    const uid = Number(args.uid);
    const bookName = String(args.book || '').trim();
    const hardDelete = Boolean(args.hard_delete);

    logToolCallStarted(TOOL_NAMES.FORGET, { uid, bookName, hardDelete });

    if (!uid && uid !== 0) {
        logToolCallError(TOOL_NAMES.FORGET, 'Missing UID');
        return 'Error: "uid" is required.';
    }

    const allowedBooks = hardDelete ? getDeletableBooks() : getWritableBooks();
    const targetBook = resolveTargetBook(bookName, allowedBooks);
    if (!targetBook) {
        logToolCallError(TOOL_NAMES.FORGET, hardDelete ? 'No deletable lorebooks' : 'No writable lorebooks');
        return hardDelete
            ? 'No Pathfinder-enabled lorebooks allow deletion.'
            : 'No Pathfinder-enabled lorebooks allow disabling entries.';
    }

    try {
        const result = await forgetEntry(targetBook, uid, hardDelete);
        logToolCallCompleted(TOOL_NAMES.FORGET, `Forgot UID:${uid} (${result.disabled ? 'disabled' : 'deleted'})`);
        return `🗑️ ${hardDelete ? 'Deleted' : 'Disabled'} entry UID:${uid} in "${targetBook}". ${hardDelete ? 'The entry has been permanently removed.' : 'The entry is disabled and can be re-enabled later.'}`;
    } catch (err) {
        logToolCallError(TOOL_NAMES.FORGET, err.message);
        return `❌ Failed to forget: ${err.message}`;
    }
}

async function forgetFormatter(args) {
    return `🗑️ Pathfinder: Forgetting entry UID:${args.uid}...`;
}

export function getDefinition() {
    return {
        name: TOOL_NAMES.FORGET,
        displayName: 'Pathfinder Forget',
        description: COMPACT_DESCRIPTION,
        parameters: {
            type: 'object',
            required: ['uid'],
            properties: {
                uid: { type: 'number', description: 'UID of the entry to forget' },
                book: { type: 'string', description: 'Lorebook name. Omit for default.' },
                hard_delete: { type: 'boolean', description: 'Permanently delete instead of disabling. Default: false.' },
            },
        },
        actionKey: 'pathfinder_forget',
        formatMessageKey: 'pathfinder_forget_fmt',
        shouldRegister: true,
        stealth: false,
        enabled: true,
    };
}

export function registerActions() {
    registerToolAction('pathfinder_forget', forgetAction);
    registerToolFormatter('pathfinder_forget_fmt', forgetFormatter);
}
