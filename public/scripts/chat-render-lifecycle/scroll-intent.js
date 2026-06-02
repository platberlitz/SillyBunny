export const CHAT_SCROLL_INTENT = Object.freeze({
    INITIAL_LOAD: 'initial-load',
    TAIL_APPEND: 'tail-append',
    HISTORY_PREPEND: 'history-prepend',
    REPLACE_MESSAGE: 'replace-message',
    STREAM_PROGRESS: 'stream-progress',
    MEDIA_RESIZE: 'media-resize',
    MANUAL_SCROLL: 'manual-scroll',
    FORCE_JUMP: 'force-jump',
});

export const CHAT_SCROLL_ACTION = Object.freeze({
    NONE: 'none',
    PIN_BOTTOM: 'pin-bottom',
    PRESERVE_ANCHOR: 'preserve-anchor',
    FORCE_EDGE: 'force-edge',
    SUPPRESS_AUTO_SCROLL: 'suppress-auto-scroll',
});

function canPinBottom({ autoScrollEnabled, isNearBottom, isManualScrollSuppressed }) {
    return Boolean(autoScrollEnabled && isNearBottom && !isManualScrollSuppressed);
}

function preserveAnchorOrNone({ hasAnchor }, reason) {
    if (!hasAnchor) {
        return { action: CHAT_SCROLL_ACTION.NONE, reason: `${reason}-no-anchor` };
    }

    return { action: CHAT_SCROLL_ACTION.PRESERVE_ANCHOR, reason };
}

/**
 * Resolves one observable scroll action for a chat render intent.
 * @param {object} options Options.
 * @param {string} options.intent Render lifecycle intent.
 * @param {boolean} [options.autoScrollEnabled=true] User auto-scroll preference.
 * @param {boolean} [options.isNearBottom=false] Whether the viewport is already near bottom.
 * @param {boolean} [options.hasAnchor=false] Whether an anchor is available for restoration.
 * @param {boolean} [options.isManualScrollSuppressed=false] Whether user scroll/touch suppression is active.
 * @param {string} [options.edge='bottom'] Forced scroll edge for explicit jumps.
 * @returns {{action: string, reason: string, edge?: string, force?: boolean}}
 */
export function resolveChatScrollAction({
    intent,
    autoScrollEnabled = true,
    isNearBottom = false,
    hasAnchor = false,
    isManualScrollSuppressed = false,
    edge = 'bottom',
} = {}) {
    switch (intent) {
        case CHAT_SCROLL_INTENT.FORCE_JUMP:
            return { action: CHAT_SCROLL_ACTION.FORCE_EDGE, edge, reason: intent };

        case CHAT_SCROLL_INTENT.INITIAL_LOAD:
            return { action: CHAT_SCROLL_ACTION.PIN_BOTTOM, force: true, reason: intent };

        case CHAT_SCROLL_INTENT.MANUAL_SCROLL:
            return { action: CHAT_SCROLL_ACTION.SUPPRESS_AUTO_SCROLL, reason: intent };

        case CHAT_SCROLL_INTENT.HISTORY_PREPEND:
            return preserveAnchorOrNone({ hasAnchor }, intent);

        case CHAT_SCROLL_INTENT.REPLACE_MESSAGE:
        case CHAT_SCROLL_INTENT.MEDIA_RESIZE:
            if (!isNearBottom) {
                return preserveAnchorOrNone({ hasAnchor }, intent);
            }

            return canPinBottom({ autoScrollEnabled, isNearBottom, isManualScrollSuppressed })
                ? { action: CHAT_SCROLL_ACTION.PIN_BOTTOM, reason: intent }
                : { action: CHAT_SCROLL_ACTION.NONE, reason: `${intent}-not-pinned` };

        case CHAT_SCROLL_INTENT.TAIL_APPEND:
        case CHAT_SCROLL_INTENT.STREAM_PROGRESS:
            return canPinBottom({ autoScrollEnabled, isNearBottom, isManualScrollSuppressed })
                ? { action: CHAT_SCROLL_ACTION.PIN_BOTTOM, reason: intent }
                : { action: CHAT_SCROLL_ACTION.NONE, reason: `${intent}-not-pinned` };

        default:
            return { action: CHAT_SCROLL_ACTION.NONE, reason: 'unknown-intent' };
    }
}
