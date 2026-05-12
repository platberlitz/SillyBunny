import { isIOSWebKitPlatform } from './mobile-send-button.js';

export const IOS_STREAMING_UPDATE_INTERVAL_MS = 250;
export const IOS_REASONING_RENDER_INTERVAL_MS = 1500;

/**
 * Checks whether live streaming DOM work should be reduced for the current browser.
 * @param {Navigator} [navigatorRef] Navigator-like object
 * @param {object} [options]
 * @param {boolean} [options.enabled] Whether the iOS WebKit reduction is enabled
 * @returns {boolean}
 */
export function shouldReduceStreamingDomWork(navigatorRef = globalThis.navigator, { enabled = true } = {}) {
    return Boolean(enabled) && isIOSWebKitPlatform(navigatorRef);
}

/**
 * Applies an iOS WebKit floor to live streaming UI updates.
 * @param {number} baseIntervalMs Requested streaming interval
 * @param {object} [options]
 * @param {Navigator} [options.navigatorRef] Navigator-like object
 * @param {boolean} [options.enabled] Whether the iOS WebKit floor is enabled
 * @returns {number}
 */
export function getStreamingUpdateInterval(baseIntervalMs, { navigatorRef = globalThis.navigator, enabled = true } = {}) {
    const interval = Number(baseIntervalMs);
    const normalizedInterval = Number.isFinite(interval) && interval > 0 ? interval : 1;

    if (!shouldReduceStreamingDomWork(navigatorRef, { enabled })) {
        return normalizedInterval;
    }

    return Math.max(normalizedInterval, IOS_STREAMING_UPDATE_INTERVAL_MS);
}

/**
 * Decides whether a live reasoning body should be rendered on this streaming tick.
 * @param {object} options
 * @param {boolean} options.isReducedDomWork Whether live DOM work is reduced for the platform
 * @param {string} options.state Current reasoning state
 * @param {boolean} options.detailsOpen Whether the reasoning details panel is open
 * @param {boolean} options.hasRenderedContent Whether the reasoning body already has rendered content
 * @param {number} options.lastRenderAt Last render timestamp
 * @param {number} options.now Current timestamp
 * @param {number} [options.minIntervalMs] Minimum interval between open-panel renders
 * @returns {boolean}
 */
export function shouldRenderLiveReasoningContent({
    isReducedDomWork,
    state,
    detailsOpen,
    hasRenderedContent,
    lastRenderAt,
    now,
    minIntervalMs = IOS_REASONING_RENDER_INTERVAL_MS,
}) {
    if (!isReducedDomWork || state !== 'thinking' || !hasRenderedContent) {
        return true;
    }

    if (!detailsOpen) {
        return false;
    }

    return now - lastRenderAt >= minIntervalMs;
}
