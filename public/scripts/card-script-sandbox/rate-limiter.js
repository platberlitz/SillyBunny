export const DEFAULT_RATE_LIMITS = Object.freeze({
    windowMs: 2000,
    perWindow: 5,
    lifetimeMax: 20,
});

export function createRateLimiter({
    windowMs = DEFAULT_RATE_LIMITS.windowMs,
    perWindow = DEFAULT_RATE_LIMITS.perWindow,
    lifetimeMax = DEFAULT_RATE_LIMITS.lifetimeMax,
    now = Date.now,
} = {}) {
    let timestamps = [];
    let lifetimeCount = 0;
    let disposed = false;

    return {
        tryAcquire() {
            if (disposed) {
                return { ok: false, reason: 'disposed' };
            }

            const currentTime = now();
            pruneTimestamps(timestamps, currentTime, windowMs);

            if (lifetimeCount >= lifetimeMax) {
                return { ok: false, reason: 'lifetime_exceeded' };
            }

            if (timestamps.length >= perWindow) {
                return { ok: false, reason: 'rate_limited' };
            }

            timestamps.push(currentTime);
            lifetimeCount++;
            return { ok: true };
        },
        reset() {
            timestamps = [];
            lifetimeCount = 0;
        },
        dispose() {
            disposed = true;
            timestamps = [];
            lifetimeCount = 0;
        },
    };
}

function pruneTimestamps(timestamps, currentTime, windowMs) {
    const cutoff = currentTime - windowMs;
    let firstActiveIndex = 0;

    while (firstActiveIndex < timestamps.length && timestamps[firstActiveIndex] <= cutoff) {
        firstActiveIndex++;
    }

    if (firstActiveIndex > 0) {
        timestamps.splice(0, firstActiveIndex);
    }
}
