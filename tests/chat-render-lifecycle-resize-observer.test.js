import { describe, expect, test } from '@jest/globals';

import { createDelegatedResizeObserver } from '../public/scripts/chat-render-lifecycle/resize-observer.js';

function createFakeResizeObserverConstructor() {
    const instances = [];

    class FakeResizeObserver {
        constructor(callback) {
            this.callback = callback;
            this.observed = [];
            this.unobserved = [];
            this.disconnectCount = 0;
            instances.push(this);
        }

        observe(element) {
            this.observed.push(element);
        }

        unobserve(element) {
            this.unobserved.push(element);
        }

        disconnect() {
            this.disconnectCount++;
        }

        trigger(entries) {
            this.callback(entries);
        }
    }

    return {
        ResizeObserverImpl: FakeResizeObserver,
        instances,
    };
}

describe('chat render lifecycle resize observer helper', () => {
    test('delegates multiple observed elements through one observer instance', () => {
        const { ResizeObserverImpl, instances } = createFakeResizeObserverConstructor();
        const firstElement = { id: 'first' };
        const secondElement = { id: 'second' };
        const callbacks = [];
        const resizeObserver = createDelegatedResizeObserver({
            ResizeObserverImpl,
            onResize: (element, entry, metadata) => callbacks.push({ element, entry, metadata }),
        });

        expect(resizeObserver.observe(firstElement, { messageId: 1 })).toBe(true);
        expect(resizeObserver.observe(secondElement, { messageId: 2 })).toBe(true);

        expect(instances).toHaveLength(1);
        expect(instances[0].observed).toEqual([firstElement, secondElement]);

        const firstEntry = { target: firstElement, contentRect: { height: 120 } };
        const secondEntry = { target: secondElement, contentRect: { height: 180 } };
        instances[0].trigger([firstEntry, secondEntry]);

        expect(callbacks).toEqual([
            { element: firstElement, entry: firstEntry, metadata: { messageId: 1 } },
            { element: secondElement, entry: secondEntry, metadata: { messageId: 2 } },
        ]);
    });

    test('does not observe the same element twice', () => {
        const { ResizeObserverImpl, instances } = createFakeResizeObserverConstructor();
        const element = { id: 'message' };
        const resizeObserver = createDelegatedResizeObserver({
            ResizeObserverImpl,
            onResize: () => {},
        });

        expect(resizeObserver.observe(element, { first: true })).toBe(true);
        expect(resizeObserver.observe(element, { second: true })).toBe(false);

        expect(instances[0].observed).toEqual([element]);
    });

    test('unobserve removes callbacks for one element without disconnecting the delegate', () => {
        const { ResizeObserverImpl, instances } = createFakeResizeObserverConstructor();
        const activeElement = { id: 'active' };
        const removedElement = { id: 'removed' };
        const callbacks = [];
        const resizeObserver = createDelegatedResizeObserver({
            ResizeObserverImpl,
            onResize: (element) => callbacks.push(element),
        });

        resizeObserver.observe(activeElement);
        resizeObserver.observe(removedElement);

        expect(resizeObserver.unobserve(removedElement)).toBe(true);
        expect(resizeObserver.unobserve(removedElement)).toBe(false);
        instances[0].trigger([
            { target: activeElement },
            { target: removedElement },
        ]);

        expect(instances[0].unobserved).toEqual([removedElement]);
        expect(instances[0].disconnectCount).toBe(0);
        expect(callbacks).toEqual([activeElement]);
    });

    test('dispose disconnects the observer and suppresses later callbacks', () => {
        const { ResizeObserverImpl, instances } = createFakeResizeObserverConstructor();
        const element = { id: 'message' };
        const callbacks = [];
        const resizeObserver = createDelegatedResizeObserver({
            ResizeObserverImpl,
            onResize: (target) => callbacks.push(target),
        });

        resizeObserver.observe(element);
        resizeObserver.dispose();
        instances[0].trigger([{ target: element }]);

        expect(instances[0].disconnectCount).toBe(1);
        expect(callbacks).toEqual([]);
    });

    test('fails fast for invalid boundary options', () => {
        expect(() => createDelegatedResizeObserver()).toThrow('ResizeObserverImpl');
        expect(() => createDelegatedResizeObserver({
            ResizeObserverImpl: null,
            onResize: () => {},
        })).toThrow('ResizeObserverImpl');
        expect(() => createDelegatedResizeObserver({
            ResizeObserverImpl: createFakeResizeObserverConstructor().ResizeObserverImpl,
            onResize: null,
        })).toThrow('onResize');
    });
});
