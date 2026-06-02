import { describe, expect, test } from '@jest/globals';

import {
    DEFAULT_SCROLL_EDGE_SETTLE_DELAYS,
    getScrollEdgePosition,
    jumpScrollElementToEdge,
} from '../public/scripts/chat-scroll-edges.js';

describe('chat scroll edge helpers', () => {
    test('keeps the intended default delayed re-pin timings', () => {
        expect(DEFAULT_SCROLL_EDGE_SETTLE_DELAYS).toEqual([80, 250, 400]);
    });

    test('computes the bottom edge as the maximum scrollTop', () => {
        expect(getScrollEdgePosition({ scrollHeight: 1200, clientHeight: 300 }, 'bottom')).toBe(900);
        expect(getScrollEdgePosition({ scrollHeight: 200, clientHeight: 300 }, 'bottom')).toBe(0);
        expect(getScrollEdgePosition({ scrollHeight: 1200, clientHeight: 300 }, 'top')).toBe(0);
    });

    test('jumps immediately and then re-pins after delayed layout growth', () => {
        const scrollElement = {
            scrollHeight: 1000,
            clientHeight: 250,
            scrollTop: 120,
        };
        const frames = [];
        const timers = [];

        const cancelJump = jumpScrollElementToEdge(scrollElement, 'bottom', {
            requestAnimationFrameRef: callback => frames.push(callback),
            setTimeoutRef: (callback, delay) => timers.push({ callback, delay }),
            settleDelays: DEFAULT_SCROLL_EDGE_SETTLE_DELAYS,
        });

        expect(typeof cancelJump).toBe('function');
        expect(scrollElement.scrollTop).toBe(750);
        expect(frames).toHaveLength(1);
        expect(timers.map(timer => timer.delay)).toEqual(DEFAULT_SCROLL_EDGE_SETTLE_DELAYS);

        scrollElement.scrollHeight = 1300;
        frames[0]();
        expect(scrollElement.scrollTop).toBe(1050);

        scrollElement.scrollHeight = 1600;
        timers.at(-1).callback();
        expect(scrollElement.scrollTop).toBe(1350);
    });

    test('cancels pending delayed re-pins before they can override a later action', () => {
        const scrollElement = {
            scrollHeight: 1000,
            clientHeight: 250,
            scrollTop: 120,
        };
        const frames = [];
        const timers = [];

        const cancelJump = jumpScrollElementToEdge(scrollElement, 'bottom', {
            requestAnimationFrameRef: callback => frames.push(callback),
            setTimeoutRef: (callback, delay) => timers.push({ callback, delay }),
            settleDelays: DEFAULT_SCROLL_EDGE_SETTLE_DELAYS,
        });

        expect(scrollElement.scrollTop).toBe(750);
        cancelJump();

        scrollElement.scrollTop = 0;
        scrollElement.scrollHeight = 1600;
        frames[0]();
        timers.at(-1).callback();

        expect(scrollElement.scrollTop).toBe(0);
    });
});
