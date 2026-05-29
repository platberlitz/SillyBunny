import { describe, expect, test } from '@jest/globals';

import { createStreamWriteBuffer } from '../public/scripts/chat-render-lifecycle/stream-buffer.js';

function createFakeScheduler() {
    let scheduledCallback = null;

    return {
        get hasScheduledCallback() {
            return typeof scheduledCallback === 'function';
        },
        requestCount: 0,
        cancelCount: 0,
        request(callback) {
            this.requestCount++;
            scheduledCallback = callback;
        },
        cancel() {
            this.cancelCount++;
            scheduledCallback = null;
        },
        run() {
            const callback = scheduledCallback;
            scheduledCallback = null;
            callback?.();
        },
    };
}

describe('chat render lifecycle stream buffer helper', () => {
    test('coalesces visible stream writes into one scheduled frame lane', () => {
        const scheduler = createFakeScheduler();
        const applied = [];
        const buffer = createStreamWriteBuffer({
            scheduler,
            applyWrite: (messageId, write, options) => applied.push({ messageId, write, options }),
        });

        expect(buffer.queue(1, { text: 'first' }, { isFinal: false })).toBe(1);
        expect(buffer.queue(1, { text: 'latest' }, { isFinal: false })).toBe(1);

        expect(scheduler.requestCount).toBe(1);
        expect(buffer.size()).toBe(1);
        expect(applied).toEqual([]);

        scheduler.run();

        expect(buffer.size()).toBe(0);
        expect(applied).toEqual([
            { messageId: 1, write: { text: 'latest' }, options: { isFinal: false } },
        ]);
    });

    test('keeps distinct message writes in insertion order', () => {
        const scheduler = createFakeScheduler();
        const applied = [];
        const buffer = createStreamWriteBuffer({
            scheduler,
            applyWrite: (messageId, write, options) => applied.push({ messageId, write, options }),
        });

        buffer.queue(2, { text: 'second' }, { isFinal: false });
        buffer.queue(3, { text: 'third' }, { isFinal: false });
        scheduler.run();

        expect(applied).toEqual([
            { messageId: 2, write: { text: 'second' }, options: { isFinal: false } },
            { messageId: 3, write: { text: 'third' }, options: { isFinal: false } },
        ]);
    });

    test('final writes flush immediately and cancel a pending scheduled frame', () => {
        const scheduler = createFakeScheduler();
        const applied = [];
        const buffer = createStreamWriteBuffer({
            scheduler,
            applyWrite: (messageId, write, options) => applied.push({ messageId, write, options }),
        });

        buffer.queue(4, { text: 'draft' }, { isFinal: false });

        expect(scheduler.hasScheduledCallback).toBe(true);
        expect(buffer.queue(4, { text: 'final' }, { isFinal: true })).toBe(0);

        expect(scheduler.cancelCount).toBe(1);
        expect(scheduler.hasScheduledCallback).toBe(false);
        expect(applied).toEqual([
            { messageId: 4, write: { text: 'final' }, options: { isFinal: true } },
        ]);
    });

    test('clears before applying so nested writes survive for the next flush', () => {
        const scheduler = createFakeScheduler();
        const applied = [];
        const buffer = createStreamWriteBuffer({
            scheduler,
            applyWrite: (messageId, write, options) => {
                applied.push({ messageId, write, options });

                if (messageId === 5) {
                    buffer.queue(6, { text: 'nested' }, { isFinal: false });
                }
            },
        });

        buffer.queue(5, { text: 'outer' }, { isFinal: true });

        expect(buffer.size()).toBe(1);
        expect(applied).toEqual([
            { messageId: 5, write: { text: 'outer' }, options: { isFinal: true } },
        ]);

        scheduler.run();

        expect(applied).toEqual([
            { messageId: 5, write: { text: 'outer' }, options: { isFinal: true } },
            { messageId: 6, write: { text: 'nested' }, options: { isFinal: false } },
        ]);
    });

    test('clear drops pending writes and cancels the scheduled frame', () => {
        const scheduler = createFakeScheduler();
        const applied = [];
        const buffer = createStreamWriteBuffer({
            scheduler,
            applyWrite: (messageId, write, options) => applied.push({ messageId, write, options }),
        });

        buffer.queue(7, { text: 'drop' }, { isFinal: false });
        buffer.clear();
        scheduler.run();

        expect(buffer.size()).toBe(0);
        expect(scheduler.cancelCount).toBe(1);
        expect(applied).toEqual([]);
    });

    test('fails fast for invalid boundary options', () => {
        expect(() => createStreamWriteBuffer()).toThrow('applyWrite');
        expect(() => createStreamWriteBuffer({ applyWrite: null })).toThrow('applyWrite');
        expect(() => createStreamWriteBuffer({
            applyWrite: () => {},
            scheduler: null,
        })).toThrow('scheduler');
    });
});
