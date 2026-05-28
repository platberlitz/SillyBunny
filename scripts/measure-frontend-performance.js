#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('../tests/node_modules/@playwright/test');

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDir = path.join(repoRoot, 'output', 'performance');
const baseUrl = process.env.SILLYBUNNY_PERF_URL || 'http://127.0.0.1:4444';
const outputPath = process.env.SILLYBUNNY_PERF_OUTPUT || path.join(outputDir, `frontend-${Date.now()}.json`);
const mobileProfile = devices['Pixel 5'];
export const LONG_CHAT_RENDER_MESSAGE_COUNT = 96;
export const LONG_CHAT_RENDER_VISIBLE_COUNT = 24;
export const LONG_CHAT_RENDER_FILLER_REPEAT = 36;

export function summarizeRequests(requests) {
    const totals = {
        count: requests.length,
        js: 0,
        css: 0,
        font: 0,
        image: 0,
        other: 0,
    };

    for (const request of requests) {
        if (/\.m?js(?:\?|$)/i.test(request.url)) {
            totals.js += request.bytes;
        } else if (/\.css(?:\?|$)/i.test(request.url)) {
            totals.css += request.bytes;
        } else if (/\.(?:woff2?|ttf)(?:\?|$)/i.test(request.url)) {
            totals.font += request.bytes;
        } else if (/\.(?:png|jpe?g|webp|gif|svg|ico)(?:\?|$)/i.test(request.url)) {
            totals.image += request.bytes;
        } else {
            totals.other += request.bytes;
        }
    }

    return totals;
}

export function createLongChatRenderFixture({
    messageCount = LONG_CHAT_RENDER_MESSAGE_COUNT,
    visibleCount = LONG_CHAT_RENDER_VISIBLE_COUNT,
    fillerRepeat = LONG_CHAT_RENDER_FILLER_REPEAT,
} = {}) {
    const messages = [];

    for (let index = 0; index < messageCount; index++) {
        const isUser = index % 2 === 0;
        const baseText = `performance synthetic message ${index}`;
        messages.push({
            name: isUser ? 'Scroll Tester' : 'Bunny Guide',
            is_user: isUser,
            is_system: false,
            send_date: new Date(Date.UTC(2024, 0, 1, 0, index)).toISOString(),
            mes: `${baseText}\n${'long chat filler '.repeat(fillerRepeat)}`,
            extra: {},
        });
    }

    return {
        messageCount,
        visibleCount,
        fillerRepeat,
        messages,
    };
}

export async function measureLongChatRender(page, fixture = createLongChatRenderFixture()) {
    const renderResult = await page.evaluate(async ({ messages, messageCount, visibleCount, fillerRepeat }) => {
        const browserGlobal = globalThis;
        const context = browserGlobal.SillyTavern?.getContext?.();
        const chatElement = browserGlobal.document.querySelector('#chat');

        if (!context || !(chatElement instanceof browserGlobal.HTMLElement) || typeof context.printMessages !== 'function') {
            return {
                available: false,
                reason: 'chat-context-unavailable',
            };
        }

        context.powerUserSettings.auto_scroll_chat_to_bottom = true;
        context.powerUserSettings.chat_truncation = visibleCount;
        context.chat.length = 0;
        chatElement.replaceChildren();
        context.chat.push(...messages);

        const start = browserGlobal.performance.now();
        await context.printMessages();
        await new Promise(resolve => browserGlobal.requestAnimationFrame(() => browserGlobal.requestAnimationFrame(resolve)));
        const durationMs = browserGlobal.performance.now() - start;
        const renderedMessages = Array.from(chatElement.querySelectorAll('.mes[mesid]'));

        return {
            available: true,
            durationMs,
            messageCount: context.chat.length,
            visibleCount,
            fillerRepeat,
            renderedCount: renderedMessages.length,
            firstRenderedMesId: renderedMessages.at(0)?.getAttribute('mesid') ?? null,
            lastRenderedMesId: renderedMessages.at(-1)?.getAttribute('mesid') ?? null,
            bottomDelta: chatElement.scrollHeight - chatElement.clientHeight - chatElement.scrollTop,
        };
    }, fixture);

    return {
        fixture: {
            messageCount: fixture.messageCount,
            visibleCount: fixture.visibleCount,
            fillerRepeat: fixture.fillerRepeat,
        },
        ...renderResult,
    };
}

async function measurePage(page) {
    const metrics = await page.evaluate(() => {
        const browserGlobal = globalThis;
        const navigation = browserGlobal.performance.getEntriesByType('navigation')[0];
        const paint = Object.fromEntries(browserGlobal.performance.getEntriesByType('paint').map(entry => [entry.name, entry.startTime]));
        const resources = browserGlobal.performance.getEntriesByType('resource');
        const longTasks = browserGlobal.performance.getEntriesByType('longtask');

        return {
            navigation: navigation ? {
                domContentLoaded: navigation.domContentLoadedEventEnd,
                load: navigation.loadEventEnd,
                transferSize: navigation.transferSize,
                encodedBodySize: navigation.encodedBodySize,
            } : null,
            paint,
            longTasks: {
                count: longTasks.length,
                totalDuration: longTasks.reduce((total, task) => total + task.duration, 0),
                longest: longTasks.reduce((max, task) => Math.max(max, task.duration), 0),
            },
            resourceCount: resources.length,
            heap: browserGlobal.performance.memory ? {
                usedJSHeapSize: browserGlobal.performance.memory.usedJSHeapSize,
                totalJSHeapSize: browserGlobal.performance.memory.totalJSHeapSize,
            } : null,
        };
    });

    const scrollFps = await page.evaluate(async () => {
        const browserGlobal = globalThis;
        const browserDocument = browserGlobal.document;
        const scroller = browserDocument.getElementById('chat') || browserDocument.scrollingElement;
        if (!scroller) {
            return null;
        }

        const frameTimes = [];
        let previous = browserGlobal.performance.now();
        const start = previous;

        return new Promise(resolve => {
            function step(now) {
                frameTimes.push(now - previous);
                previous = now;
                scroller.scrollTop += 24;

                if (now - start >= 1000) {
                    const averageFrame = frameTimes.reduce((total, frame) => total + frame, 0) / Math.max(1, frameTimes.length);
                    resolve({
                        frames: frameTimes.length,
                        averageFrame,
                        estimatedFps: averageFrame ? 1000 / averageFrame : 0,
                    });
                    return;
                }

                browserGlobal.requestAnimationFrame(step);
            }

            browserGlobal.requestAnimationFrame(step);
        });
    });

    return {
        ...metrics,
        scrollFps,
        chatRender: {
            longChat: await measureLongChatRender(page),
        },
    };
}

export async function run() {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const browser = await chromium.launch();
    const context = await browser.newContext({
        ...mobileProfile,
        serviceWorkers: 'block',
    });
    const page = await context.newPage();
    const requests = [];

    await page.route('**/*', async (route) => {
        const request = route.request();
        const response = await route.fetch();
        const body = await response.body();
        requests.push({
            url: request.url(),
            method: request.method(),
            status: response.status(),
            bytes: body.length,
        });
        await route.fulfill({ response, body });
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction('document.getElementById("preloader") === null', { timeout: 60000 }).catch(() => {});
    await page.waitForFunction(() => {
        const browserGlobal = globalThis;
        return typeof browserGlobal.SillyTavern?.getContext === 'function'
            && browserGlobal.document.querySelector('#chat') instanceof browserGlobal.HTMLElement;
    }, { timeout: 60000 }).catch(() => {});

    const result = {
        url: baseUrl,
        profile: 'Pixel 5',
        measuredAt: new Date().toISOString(),
        metrics: await measurePage(page),
        requests: summarizeRequests(requests),
    };

    await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));

    await browser.close();
}

function isDirectRun() {
    return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
    run().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
