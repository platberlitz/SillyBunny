import { describe, expect, test } from '@jest/globals';

import {
    CHAT_SCROLL_ACTION,
    CHAT_SCROLL_INTENT,
    resolveChatScrollAction,
} from '../public/scripts/chat-render-lifecycle/scroll-intent.js';

describe('chat render lifecycle scroll intent', () => {
    test('force-jump always jumps to the requested edge', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.FORCE_JUMP,
            edge: 'top',
            autoScrollEnabled: false,
            isNearBottom: false,
            isManualScrollSuppressed: true,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.FORCE_EDGE, edge: 'top' }));
    });

    test('history prepend preserves an existing visible anchor', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.HISTORY_PREPEND,
            hasAnchor: true,
            autoScrollEnabled: true,
            isNearBottom: false,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.PRESERVE_ANCHOR }));
    });

    test('replace message preserves anchor when user is scrolled up', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.REPLACE_MESSAGE,
            hasAnchor: true,
            autoScrollEnabled: true,
            isNearBottom: false,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.PRESERVE_ANCHOR }));
    });

    test('tail append pins bottom when auto-scroll is enabled and viewport is already near bottom', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.TAIL_APPEND,
            autoScrollEnabled: true,
            isNearBottom: true,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.PIN_BOTTOM }));
    });

    test('tail append does not yank a user-scrolled viewport', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.TAIL_APPEND,
            autoScrollEnabled: true,
            isNearBottom: false,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.NONE }));
    });

    test('stream progress pins bottom only when near bottom and not manually suppressed', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.STREAM_PROGRESS,
            autoScrollEnabled: true,
            isNearBottom: true,
            isManualScrollSuppressed: false,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.PIN_BOTTOM }));
    });

    test('stream progress yields to manual mobile scroll suppression', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.STREAM_PROGRESS,
            autoScrollEnabled: true,
            isNearBottom: true,
            isManualScrollSuppressed: true,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.NONE }));
    });

    test('stream progress defers bottom pinning during an active touch', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.STREAM_PROGRESS,
            autoScrollEnabled: true,
            isNearBottom: true,
            isManualScrollSuppressed: true,
            isTouchActive: true,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.DEFER_UNTIL_TOUCH_END }));
    });

    test('initial load forces bottom regardless of auto-scroll preference', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.INITIAL_LOAD,
            autoScrollEnabled: false,
            isNearBottom: false,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.PIN_BOTTOM, force: true }));
    });

    test('media resize preserves anchor when user is scrolled up', () => {
        expect(resolveChatScrollAction({
            intent: CHAT_SCROLL_INTENT.MEDIA_RESIZE,
            hasAnchor: true,
            autoScrollEnabled: true,
            isNearBottom: false,
        })).toEqual(expect.objectContaining({ action: CHAT_SCROLL_ACTION.PRESERVE_ANCHOR }));
    });

    test('unknown intents fail closed without scrolling', () => {
        expect(resolveChatScrollAction({ intent: 'unknown-intent', autoScrollEnabled: true, isNearBottom: true })).toEqual({
            action: CHAT_SCROLL_ACTION.NONE,
            reason: 'unknown-intent',
        });
    });
});
