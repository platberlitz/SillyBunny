import { describe, expect, test } from '@jest/globals';

import {
    createMobileViewportObserver,
    MOBILE_VIEWPORT_SETTLE_DELAY_MS,
} from '../public/scripts/chat-render-lifecycle/mobile-viewport.js';

function createViewportHarness() {
    const listeners = new Map();

    return {
        addedListeners: [],
        removedListeners: [],
        viewport: {
            addEventListener(type, listener, options) {
                listeners.set(type, listener);
                this.addedListeners.push({ type, listener, options });
            },
            removeEventListener(type, listener, options) {
                if (listeners.get(type) === listener) {
                    listeners.delete(type);
                }

                this.removedListeners.push({ type, listener, options });
            },
            get addedListeners() {
                return this._addedListeners;
            },
            set addedListeners(value) {
                this._addedListeners = value;
            },
            get removedListeners() {
                return this._removedListeners;
            },
            set removedListeners(value) {
                this._removedListeners = value;
            },
            trigger(type, event = { type }) {
                listeners.get(type)?.(event);
            },
        },
        listeners,
    };
}

function createTimerHarness() {
    let nextTimerId = 1;
    const timers = [];
    const clearedTimers = [];

    return {
        timers,
        clearedTimers,
        setTimeoutRef(callback, delay) {
            const timerId = nextTimerId++;
            timers.push({ timerId, callback, delay });
            return timerId;
        },
        clearTimeoutRef(timerId) {
            clearedTimers.push(timerId);
        },
    };
}

describe('chat render lifecycle mobile viewport observer', () => {
    test('uses a conservative visual viewport settle delay', () => {
        expect(MOBILE_VIEWPORT_SETTLE_DELAY_MS).toBe(180);
    });

    test('subscribes visual viewport scroll and resize through one disposable adapter', () => {
        const { viewport } = createViewportHarness();
        viewport.addedListeners = [];
        viewport.removedListeners = [];
        const observer = createMobileViewportObserver({
            viewport,
            onViewportChange: () => {},
        });

        expect(observer.start()).toBe(true);
        expect(observer.start()).toBe(false);
        expect(observer.isStarted()).toBe(true);
        expect(viewport.addedListeners.map(listener => listener.type)).toEqual(['scroll', 'resize']);
        expect(viewport.addedListeners.every(listener => listener.options.passive === true)).toBe(true);

        observer.dispose();

        expect(observer.isStarted()).toBe(false);
        expect(viewport.removedListeners.map(listener => listener.type)).toEqual(['scroll', 'resize']);
        expect(viewport.removedListeners.every(listener => listener.options.passive === true)).toBe(true);
    });

    test('forwards viewport movement events immediately', () => {
        const { viewport } = createViewportHarness();
        viewport.addedListeners = [];
        viewport.removedListeners = [];
        const changes = [];
        const observer = createMobileViewportObserver({
            viewport,
            onViewportChange: event => changes.push(event.type),
        });

        observer.start();
        viewport.trigger('scroll', { type: 'scroll' });
        viewport.trigger('resize', { type: 'resize' });

        expect(changes).toEqual(['scroll', 'resize']);
    });

    test('debounces cancellable settle detection for momentum-style viewport movement', () => {
        const { viewport } = createViewportHarness();
        viewport.addedListeners = [];
        viewport.removedListeners = [];
        const timers = createTimerHarness();
        const settledEvents = [];
        const observer = createMobileViewportObserver({
            viewport,
            onViewportChange: () => {},
            onViewportSettle: event => settledEvents.push(event.type),
            setTimeoutRef: timers.setTimeoutRef,
            clearTimeoutRef: timers.clearTimeoutRef,
        });

        observer.start();
        viewport.trigger('scroll', { type: 'scroll' });
        viewport.trigger('resize', { type: 'resize' });

        expect(timers.timers).toHaveLength(2);
        expect(timers.timers.map(timer => timer.delay)).toEqual([
            MOBILE_VIEWPORT_SETTLE_DELAY_MS,
            MOBILE_VIEWPORT_SETTLE_DELAY_MS,
        ]);
        expect(timers.clearedTimers).toEqual([1]);

        timers.timers.at(-1).callback();

        expect(settledEvents).toEqual(['resize']);
    });

    test('dispose cancels pending settle callbacks', () => {
        const { viewport } = createViewportHarness();
        viewport.addedListeners = [];
        viewport.removedListeners = [];
        const timers = createTimerHarness();
        const settledEvents = [];
        const observer = createMobileViewportObserver({
            viewport,
            onViewportChange: () => {},
            onViewportSettle: event => settledEvents.push(event.type),
            setTimeoutRef: timers.setTimeoutRef,
            clearTimeoutRef: timers.clearTimeoutRef,
        });

        observer.start();
        viewport.trigger('scroll', { type: 'scroll' });
        observer.dispose();

        expect(timers.clearedTimers).toEqual([1]);
        timers.timers[0].callback();
        expect(settledEvents).toEqual([]);
    });

    test('does not subscribe when visualViewport is unavailable', () => {
        const observer = createMobileViewportObserver({
            viewport: null,
            onViewportChange: () => {},
        });

        expect(observer.start()).toBe(false);
        expect(observer.isStarted()).toBe(false);

        observer.dispose();
        expect(observer.isStarted()).toBe(false);
    });

    test('fails fast for invalid boundary options', () => {
        expect(() => createMobileViewportObserver()).toThrow('onViewportChange');
        expect(() => createMobileViewportObserver({
            onViewportChange: null,
        })).toThrow('onViewportChange');
        expect(() => createMobileViewportObserver({
            onViewportChange: () => {},
            onViewportSettle: 'settle',
        })).toThrow('onViewportSettle');
        expect(() => createMobileViewportObserver({
            onViewportChange: () => {},
            setTimeoutRef: null,
        })).toThrow('setTimeoutRef');
        expect(() => createMobileViewportObserver({
            onViewportChange: () => {},
            clearTimeoutRef: null,
        })).toThrow('clearTimeoutRef');
    });
});
