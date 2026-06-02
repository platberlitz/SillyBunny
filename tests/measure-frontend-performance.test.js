/* global globalThis */
import { describe, expect, test } from '@jest/globals';

import {
    createLongChatRenderFixture,
    LONG_CHAT_RENDER_FILLER_REPEAT,
    LONG_CHAT_RENDER_MESSAGE_COUNT,
    LONG_CHAT_RENDER_VISIBLE_COUNT,
    measureLongChatRender,
    summarizeRequests,
} from '../scripts/measure-frontend-performance.js';

describe('frontend performance measurement helpers', () => {
    test('records the long-chat render fixture size used for baseline measurements', () => {
        const fixture = createLongChatRenderFixture();

        expect(fixture.messageCount).toBe(LONG_CHAT_RENDER_MESSAGE_COUNT);
        expect(fixture.visibleCount).toBe(LONG_CHAT_RENDER_VISIBLE_COUNT);
        expect(fixture.fillerRepeat).toBe(LONG_CHAT_RENDER_FILLER_REPEAT);
        expect(fixture.messages).toHaveLength(96);
        expect(fixture.messages.at(0)).toEqual(expect.objectContaining({
            name: 'Scroll Tester',
            is_user: true,
            is_system: false,
        }));
        expect(fixture.messages.at(1)).toEqual(expect.objectContaining({
            name: 'Bunny Guide',
            is_user: false,
            is_system: false,
        }));
        expect(fixture.messages.at(-1).mes).toContain('performance synthetic message 95');
    });

    test('summarizes request bytes by asset type', () => {
        expect(summarizeRequests([
            { url: 'http://example.test/script.js', bytes: 12 },
            { url: 'http://example.test/styles.css?v=1', bytes: 20 },
            { url: 'http://example.test/font.woff2', bytes: 30 },
            { url: 'http://example.test/image.webp', bytes: 40 },
            { url: 'http://example.test/api/status', bytes: 50 },
        ])).toEqual({
            count: 5,
            js: 12,
            css: 20,
            font: 30,
            image: 40,
            other: 50,
        });
    });

    test('measures long-chat render timing through the browser page contract', async () => {
        const page = {
            evaluate: async (callback, fixture) => {
                const previousGlobal = globalThis.SillyTavern;
                const previousDocument = globalThis.document;
                const previousHTMLElement = globalThis.HTMLElement;
                const previousPerformance = globalThis.performance;
                const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
                const renderedMessages = [];
                const chatElement = {
                    scrollHeight: 1200,
                    clientHeight: 500,
                    scrollTop: 700,
                    replaceChildren: () => renderedMessages.splice(0),
                    querySelectorAll: () => renderedMessages,
                };
                const context = {
                    powerUserSettings: {},
                    chat: [],
                    printMessages: async () => {
                        renderedMessages.push(...fixture.messages.slice(-fixture.visibleCount).map((message, offset) => ({
                            getAttribute: attributeName => attributeName === 'mesid'
                                ? String(fixture.messageCount - fixture.visibleCount + offset)
                                : null,
                        })));
                    },
                };

                try {
                    globalThis.HTMLElement = Object;
                    globalThis.document = {
                        querySelector: () => chatElement,
                    };
                    globalThis.SillyTavern = {
                        getContext: () => context,
                    };
                    globalThis.performance = {
                        now: (() => {
                            let now = 100;
                            return () => {
                                now += 25;
                                return now;
                            };
                        })(),
                    };
                    globalThis.requestAnimationFrame = callbackRef => callbackRef();

                    return await callback(fixture);
                } finally {
                    globalThis.SillyTavern = previousGlobal;
                    globalThis.document = previousDocument;
                    globalThis.HTMLElement = previousHTMLElement;
                    globalThis.performance = previousPerformance;
                    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
                }
            },
        };

        const result = await measureLongChatRender(page, createLongChatRenderFixture());

        expect(result).toEqual(expect.objectContaining({
            available: true,
            durationMs: 25,
            messageCount: 96,
            visibleCount: 24,
            fillerRepeat: 36,
            renderedCount: 24,
            firstRenderedMesId: '72',
            lastRenderedMesId: '95',
            bottomDelta: 0,
        }));
        expect(result.fixture).toEqual({
            messageCount: 96,
            visibleCount: 24,
            fillerRepeat: 36,
        });
    });
});
