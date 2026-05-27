import { describe, expect, test } from '@jest/globals';

import {
    CHAT_SCROLL_ACTION,
    resolveChatBottomScrollAction,
    shouldApplyChatBottomScrollAction,
} from '../public/scripts/chat-render-lifecycle/bottom-scroll.js';

describe('chat render lifecycle bottom scroll action', () => {
    test('force bottom scroll bypasses auto-scroll and suppression state', () => {
        expect(resolveChatBottomScrollAction({
            force: true,
            autoScrollEnabled: false,
            isNearBottom: false,
            isManualScrollSuppressed: true,
        })).toEqual({
            action: CHAT_SCROLL_ACTION.FORCE_EDGE,
            edge: 'bottom',
            reason: 'force-jump',
        });
    });

    test('pins bottom when auto-scroll is enabled and the viewport is already near bottom', () => {
        expect(resolveChatBottomScrollAction({
            autoScrollEnabled: true,
            isNearBottom: true,
            isManualScrollSuppressed: false,
        })).toEqual({
            action: CHAT_SCROLL_ACTION.PIN_BOTTOM,
            reason: 'tail-append',
        });
    });

    test('does not pin bottom when auto-scroll is disabled', () => {
        expect(resolveChatBottomScrollAction({
            autoScrollEnabled: false,
            isNearBottom: true,
            isManualScrollSuppressed: false,
        })).toEqual({
            action: CHAT_SCROLL_ACTION.NONE,
            reason: 'tail-append-not-pinned',
        });
    });

    test('does not pin bottom while manual mobile scroll is suppressed', () => {
        expect(resolveChatBottomScrollAction({
            autoScrollEnabled: true,
            isNearBottom: true,
            isManualScrollSuppressed: true,
        })).toEqual({
            action: CHAT_SCROLL_ACTION.NONE,
            reason: 'tail-append-not-pinned',
        });
    });

    test('does not pin bottom when the viewport is away from bottom', () => {
        expect(resolveChatBottomScrollAction({
            autoScrollEnabled: true,
            isNearBottom: false,
            isManualScrollSuppressed: false,
        })).toEqual({
            action: CHAT_SCROLL_ACTION.NONE,
            reason: 'tail-append-not-pinned',
        });
    });

    test('identifies bottom-moving lifecycle actions', () => {
        expect(shouldApplyChatBottomScrollAction({ action: CHAT_SCROLL_ACTION.PIN_BOTTOM })).toBe(true);
        expect(shouldApplyChatBottomScrollAction({ action: CHAT_SCROLL_ACTION.FORCE_EDGE, edge: 'bottom' })).toBe(true);
        expect(shouldApplyChatBottomScrollAction({ action: CHAT_SCROLL_ACTION.FORCE_EDGE, edge: 'top' })).toBe(false);
        expect(shouldApplyChatBottomScrollAction({ action: CHAT_SCROLL_ACTION.NONE })).toBe(false);
        expect(shouldApplyChatBottomScrollAction(null)).toBe(false);
    });
});
