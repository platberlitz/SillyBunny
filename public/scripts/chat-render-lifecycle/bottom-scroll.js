import {
    CHAT_SCROLL_ACTION,
    CHAT_SCROLL_INTENT,
    resolveChatScrollAction,
} from './scroll-intent.js';

export { CHAT_SCROLL_ACTION } from './scroll-intent.js';

/**
 * Resolves bottom-scroll requests through lifecycle intent rules.
 * @param {object} [options] Options.
 * @param {boolean} [options.force=false] Bypass preference/suppression and jump bottom.
 * @param {boolean} [options.autoScrollEnabled=true] User auto-scroll preference.
 * @param {boolean} [options.isNearBottom=false] Whether the viewport was already near bottom.
 * @param {boolean} [options.isManualScrollSuppressed=false] Whether user scroll/touch suppression is active.
 * @returns {{action: string, reason: string, edge?: string, force?: boolean}}
 */
export function resolveChatBottomScrollAction({
    force = false,
    autoScrollEnabled = true,
    isNearBottom = false,
    isManualScrollSuppressed = false,
} = {}) {
    if (force) {
        return resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.FORCE_JUMP,
            edge: 'bottom',
        });
    }

    return resolveChatScrollAction({
        intent: CHAT_SCROLL_INTENT.TAIL_APPEND,
        autoScrollEnabled,
        isNearBottom,
        isManualScrollSuppressed,
    });
}

/**
 * Checks whether a resolved lifecycle scroll action should move the chat to bottom.
 * @param {{action?: string, edge?: string}|null|undefined} action Resolved action.
 * @returns {boolean}
 */
export function shouldApplyChatBottomScrollAction(action) {
    return action?.action === CHAT_SCROLL_ACTION.PIN_BOTTOM
        || (action?.action === CHAT_SCROLL_ACTION.FORCE_EDGE && action?.edge === 'bottom');
}
