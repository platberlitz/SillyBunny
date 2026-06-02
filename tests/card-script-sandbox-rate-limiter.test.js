import { describe, expect, test } from '@jest/globals';
import { createRateLimiter } from '../public/scripts/card-script-sandbox/rate-limiter.js';

describe('card script sandbox rate limiter', () => {
    test('limits bursts inside a single window', () => {
        let currentTime = 1000;
        const limiter = createRateLimiter({ windowMs: 1000, perWindow: 2, lifetimeMax: 10, now: () => currentTime });

        expect(limiter.tryAcquire()).toEqual({ ok: true });
        expect(limiter.tryAcquire()).toEqual({ ok: true });
        expect(limiter.tryAcquire()).toEqual({ ok: false, reason: 'rate_limited' });
    });

    test('allows requests again after the window advances', () => {
        let currentTime = 1000;
        const limiter = createRateLimiter({ windowMs: 1000, perWindow: 2, lifetimeMax: 10, now: () => currentTime });

        expect(limiter.tryAcquire()).toEqual({ ok: true });
        expect(limiter.tryAcquire()).toEqual({ ok: true });
        expect(limiter.tryAcquire()).toEqual({ ok: false, reason: 'rate_limited' });

        currentTime = 2001;

        expect(limiter.tryAcquire()).toEqual({ ok: true });
    });

    test('enforces the lifetime cap across windows', () => {
        let currentTime = 0;
        const limiter = createRateLimiter({ windowMs: 10, perWindow: 1, lifetimeMax: 3, now: () => currentTime });

        expect(limiter.tryAcquire()).toEqual({ ok: true });
        currentTime = 11;
        expect(limiter.tryAcquire()).toEqual({ ok: true });
        currentTime = 22;
        expect(limiter.tryAcquire()).toEqual({ ok: true });
        currentTime = 33;

        expect(limiter.tryAcquire()).toEqual({ ok: false, reason: 'lifetime_exceeded' });
    });

    test('reset clears window and lifetime state', () => {
        let currentTime = 0;
        const limiter = createRateLimiter({ windowMs: 1000, perWindow: 1, lifetimeMax: 1, now: () => currentTime });

        expect(limiter.tryAcquire()).toEqual({ ok: true });
        expect(limiter.tryAcquire()).toEqual({ ok: false, reason: 'lifetime_exceeded' });

        currentTime = 5000;
        limiter.reset();

        expect(limiter.tryAcquire()).toEqual({ ok: true });
    });

    test('dispose is idempotent and denies future requests', () => {
        const limiter = createRateLimiter();

        expect(limiter.tryAcquire()).toEqual({ ok: true });
        limiter.dispose();
        limiter.dispose();
        limiter.reset();

        expect(limiter.tryAcquire()).toEqual({ ok: false, reason: 'disposed' });
    });
});
