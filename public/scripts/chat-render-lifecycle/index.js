import {
    captureVisibleMessageAnchor,
    restoreVisibleMessageAnchor,
    settleVisibleMessageAnchor,
} from './anchor.js';
import {
    createFrameWriteScheduler,
    runSettledFrames,
} from './scheduler.js';
import {
    CHAT_SCROLL_ACTION,
    CHAT_SCROLL_INTENT,
    resolveChatScrollAction,
} from './scroll-intent.js';
import {
    CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY,
    resolveChatRenderLifecycleRollout,
} from './rollout-guard.js';

export {
    CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY,
    CHAT_SCROLL_ACTION,
    CHAT_SCROLL_INTENT,
    captureVisibleMessageAnchor,
    createFrameWriteScheduler,
    resolveChatScrollAction,
    restoreVisibleMessageAnchor,
    resolveChatRenderLifecycleRollout,
    runSettledFrames,
    settleVisibleMessageAnchor,
};

/**
 * Creates the compatibility-facing chat render lifecycle seam.
 * Runtime call sites should depend on this shape instead of individual modules.
 */
export function createChatRenderLifecycle() {
    return {
        anchor: {
            capture: captureVisibleMessageAnchor,
            restore: restoreVisibleMessageAnchor,
            settle: settleVisibleMessageAnchor,
        },
        scheduler: {
            createFrameWriteScheduler,
            runSettledFrames,
        },
        scrollIntent: {
            action: CHAT_SCROLL_ACTION,
            intent: CHAT_SCROLL_INTENT,
            resolve: resolveChatScrollAction,
        },
        rollout: {
            key: CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY,
            resolve: resolveChatRenderLifecycleRollout,
        },
    };
}
