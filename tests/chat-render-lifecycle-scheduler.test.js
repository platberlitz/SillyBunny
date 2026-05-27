import { describe, expect, test } from '@jest/globals';

import {
    createFrameWriteScheduler,
    runSettledFrames,
} from '../public/scripts/chat-render-lifecycle/scheduler.js';

function createFrameHarness() {
    let nextFrameId = 1;
    const frames = [];
    const cancelledFrameIds = [];

    return {
        frames,
        cancelledFrameIds,
        requestAnimationFrameRef: (callback) => {
            const frameId = nextFrameId++;
            frames.push({ frameId, callback });
            return frameId;
        },
        cancelAnimationFrameRef: frameId => cancelledFrameIds.push(frameId),
    };
}

describe('chat render lifecycle scheduler', () => {
    test('coalesces repeated frame write requests into the latest callback', () => {
        const harness = createFrameHarness();
        const scheduler = createFrameWriteScheduler(harness);
        const writes = [];

        scheduler.request(() => writes.push('first'));
        scheduler.request(() => writes.push('second'));
        scheduler.request(() => writes.push('third'));

        expect(harness.frames).toHaveLength(1);

        harness.frames[0].callback();

        expect(writes).toEqual(['third']);
    });

    test('cancels a queued frame write before it runs', () => {
        const harness = createFrameHarness();
        const scheduler = createFrameWriteScheduler(harness);
        const writes = [];

        scheduler.request(() => writes.push('first'));
        scheduler.cancel();
        harness.frames[0].callback();

        expect(writes).toEqual([]);
        expect(harness.cancelledFrameIds).toEqual([1]);
    });

    test('accepts a new frame write after the previous frame flushed', () => {
        const harness = createFrameHarness();
        const scheduler = createFrameWriteScheduler(harness);
        const writes = [];

        scheduler.request(() => writes.push('first'));
        harness.frames[0].callback();
        scheduler.request(() => writes.push('second'));
        harness.frames[1].callback();

        expect(writes).toEqual(['first', 'second']);
        expect(harness.frames.map(frame => frame.frameId)).toEqual([1, 2]);
    });

    test('runs settle work once per animation frame', async () => {
        const harness = createFrameHarness();
        const writes = [];
        const settling = runSettledFrames(() => writes.push(writes.length + 1), {
            frames: 3,
            requestAnimationFrameRef: harness.requestAnimationFrameRef,
        });

        expect(harness.frames).toHaveLength(1);
        harness.frames.shift().callback();
        await Promise.resolve();
        expect(writes).toEqual([1]);

        harness.frames.shift().callback();
        await Promise.resolve();
        expect(writes).toEqual([1, 2]);

        harness.frames.shift().callback();
        await settling;
        expect(writes).toEqual([1, 2, 3]);
    });
});
