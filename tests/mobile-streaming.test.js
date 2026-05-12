import {
    getStreamingUpdateInterval,
    IOS_REASONING_RENDER_INTERVAL_MS,
    IOS_STREAMING_UPDATE_INTERVAL_MS,
    shouldRenderLiveReasoningContent,
} from '../public/scripts/mobile-streaming.js';

describe('mobile streaming helpers', () => {
    test('uses conservative iOS streaming floors', () => {
        expect(IOS_STREAMING_UPDATE_INTERVAL_MS).toBe(250);
        expect(IOS_REASONING_RENDER_INTERVAL_MS).toBe(1500);
    });

    test('keeps desktop streaming intervals unchanged', () => {
        expect(getStreamingUpdateInterval(33, {
            navigatorRef: { platform: 'Linux x86_64', maxTouchPoints: 1 },
        })).toBe(33);
    });

    test('applies an iOS WebKit floor to streaming updates', () => {
        expect(getStreamingUpdateInterval(33, {
            navigatorRef: { platform: 'iPhone', maxTouchPoints: 1 },
        })).toBe(IOS_STREAMING_UPDATE_INTERVAL_MS);

        expect(getStreamingUpdateInterval(500, {
            navigatorRef: { platform: 'iPhone', maxTouchPoints: 1 },
        })).toBe(500);
    });

    test('allows iOS WebKit streaming floors to be disabled', () => {
        expect(getStreamingUpdateInterval(33, {
            navigatorRef: { platform: 'iPhone', maxTouchPoints: 1 },
            enabled: false,
        })).toBe(33);
    });

    test('skips repeated hidden live reasoning renders on reduced DOM platforms', () => {
        expect(shouldRenderLiveReasoningContent({
            isReducedDomWork: true,
            state: 'thinking',
            detailsOpen: false,
            hasRenderedContent: true,
            lastRenderAt: 1000,
            now: 2000,
        })).toBe(false);
    });

    test('renders the first and finished reasoning bodies', () => {
        expect(shouldRenderLiveReasoningContent({
            isReducedDomWork: true,
            state: 'thinking',
            detailsOpen: false,
            hasRenderedContent: false,
            lastRenderAt: 0,
            now: 1000,
        })).toBe(true);

        expect(shouldRenderLiveReasoningContent({
            isReducedDomWork: true,
            state: 'done',
            detailsOpen: false,
            hasRenderedContent: true,
            lastRenderAt: 1000,
            now: 1100,
        })).toBe(true);
    });

    test('throttles open live reasoning renders on reduced DOM platforms', () => {
        expect(shouldRenderLiveReasoningContent({
            isReducedDomWork: true,
            state: 'thinking',
            detailsOpen: true,
            hasRenderedContent: true,
            lastRenderAt: 1000,
            now: 1000 + IOS_REASONING_RENDER_INTERVAL_MS - 1,
        })).toBe(false);

        expect(shouldRenderLiveReasoningContent({
            isReducedDomWork: true,
            state: 'thinking',
            detailsOpen: true,
            hasRenderedContent: true,
            lastRenderAt: 1000,
            now: 1000 + IOS_REASONING_RENDER_INTERVAL_MS,
        })).toBe(true);
    });
});
