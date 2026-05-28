import { describe, expect, test } from '@jest/globals';

import {
    CHAT_SCROLL_ACTION,
    CHAT_SCROLL_INTENT,
    CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY,
    captureVisibleMessageAnchor,
    createChatRenderLifecycle,
    createFrameWriteScheduler,
    resolveChatRenderLifecycleRollout,
    resolveChatScrollAction,
    restoreVisibleMessageAnchor,
    runSettledFrames,
    settleVisibleMessageAnchor,
} from '../public/scripts/chat-render-lifecycle/index.js';

describe('chat render lifecycle index seam', () => {
    test('re-exports lifecycle helper modules through one stable seam', () => {
        expect(typeof captureVisibleMessageAnchor).toBe('function');
        expect(typeof restoreVisibleMessageAnchor).toBe('function');
        expect(typeof settleVisibleMessageAnchor).toBe('function');
        expect(typeof createFrameWriteScheduler).toBe('function');
        expect(typeof runSettledFrames).toBe('function');
        expect(typeof resolveChatScrollAction).toBe('function');
        expect(typeof resolveChatRenderLifecycleRollout).toBe('function');
        expect(CHAT_SCROLL_INTENT.TAIL_APPEND).toBe('tail-append');
        expect(CHAT_SCROLL_ACTION.PIN_BOTTOM).toBe('pin-bottom');
        expect(CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY).toBe('sillybunny.chatRenderLifecycle.enabled');
    });

    test('creates a pass-through lifecycle adapter without mutating runtime behavior', () => {
        const lifecycle = createChatRenderLifecycle();

        expect(lifecycle.anchor.capture).toBe(captureVisibleMessageAnchor);
        expect(lifecycle.anchor.restore).toBe(restoreVisibleMessageAnchor);
        expect(lifecycle.anchor.settle).toBe(settleVisibleMessageAnchor);
        expect(lifecycle.scheduler.createFrameWriteScheduler).toBe(createFrameWriteScheduler);
        expect(lifecycle.scheduler.runSettledFrames).toBe(runSettledFrames);
        expect(lifecycle.scrollIntent.resolve).toBe(resolveChatScrollAction);
        expect(lifecycle.scrollIntent.intent).toBe(CHAT_SCROLL_INTENT);
        expect(lifecycle.scrollIntent.action).toBe(CHAT_SCROLL_ACTION);
        expect(lifecycle.rollout.key).toBe(CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY);
        expect(lifecycle.rollout.resolve).toBe(resolveChatRenderLifecycleRollout);
    });
});
