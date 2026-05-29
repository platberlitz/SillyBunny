import { describe, expect, test } from '@jest/globals';

import { createMessageUpdateQueue } from '../public/scripts/chat-render-lifecycle/update-queue.js';

describe('chat render lifecycle update queue helper', () => {
    test('queues and flushes message updates through the injected apply function in order', () => {
        const applied = [];
        const queue = createMessageUpdateQueue({
            applyUpdate: (messageId, message, options) => applied.push({ messageId, message, options }),
        });

        expect(queue.queue(3, { mes: 'first' }, { rerenderMessage: true })).toBe(1);
        expect(queue.queue(4, { mes: 'second' }, { rerenderMessage: false })).toBe(2);

        expect(queue.size()).toBe(2);
        expect(queue.flush()).toBe(2);
        expect(queue.size()).toBe(0);
        expect(applied).toEqual([
            { messageId: 3, message: { mes: 'first' }, options: { rerenderMessage: true } },
            { messageId: 4, message: { mes: 'second' }, options: { rerenderMessage: false } },
        ]);
    });

    test('coalesces duplicate message ids with the latest message and any rerender request', () => {
        const applied = [];
        const queue = createMessageUpdateQueue({
            applyUpdate: (messageId, message, options) => applied.push({ messageId, message, options }),
        });

        queue.queue(5, { mes: 'old' }, { rerenderMessage: true });
        queue.queue(5, { mes: 'new' }, { rerenderMessage: false });

        expect(queue.size()).toBe(1);
        expect(queue.flush()).toBe(1);
        expect(applied).toEqual([
            { messageId: 5, message: { mes: 'new' }, options: { rerenderMessage: true } },
        ]);
    });

    test('defaults rerenderMessage to true when callers omit options', () => {
        const applied = [];
        const queue = createMessageUpdateQueue({
            applyUpdate: (messageId, message, options) => applied.push({ messageId, message, options }),
        });

        queue.queue(6, { mes: 'default' });
        queue.flush();

        expect(applied).toEqual([
            { messageId: 6, message: { mes: 'default' }, options: { rerenderMessage: true } },
        ]);
    });

    test('clears pending updates before applying so nested queue work survives for the next flush', () => {
        const applied = [];
        const queue = createMessageUpdateQueue({
            applyUpdate: (messageId, message, options) => {
                applied.push({ messageId, message, options });

                if (messageId === 1) {
                    queue.queue(2, { mes: 'nested' }, { rerenderMessage: false });
                }
            },
        });

        queue.queue(1, { mes: 'outer' }, { rerenderMessage: false });

        expect(queue.flush()).toBe(1);
        expect(queue.size()).toBe(1);
        expect(queue.flush()).toBe(1);
        expect(applied).toEqual([
            { messageId: 1, message: { mes: 'outer' }, options: { rerenderMessage: false } },
            { messageId: 2, message: { mes: 'nested' }, options: { rerenderMessage: false } },
        ]);
    });

    test('clear drops pending updates without applying them', () => {
        const applied = [];
        const queue = createMessageUpdateQueue({
            applyUpdate: (messageId, message, options) => applied.push({ messageId, message, options }),
        });

        queue.queue(1, { mes: 'drop' });
        queue.clear();

        expect(queue.size()).toBe(0);
        expect(queue.flush()).toBe(0);
        expect(applied).toEqual([]);
    });

    test('fails fast for invalid apply function', () => {
        expect(() => createMessageUpdateQueue()).toThrow('applyUpdate');
        expect(() => createMessageUpdateQueue({ applyUpdate: null })).toThrow('applyUpdate');
    });
});
