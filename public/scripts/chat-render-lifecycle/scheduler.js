/**
 * Creates a latest-write-wins scheduler for one DOM write lane per animation frame.
 * @param {object} [options] Options.
 * @param {(callback: FrameRequestCallback) => number|void} [options.requestAnimationFrameRef] Frame scheduler.
 * @param {(handle: number|void) => void} [options.cancelAnimationFrameRef] Frame cancellation function.
 * @returns {{request: (callback: () => void) => void, cancel: () => void}}
 */
export function createFrameWriteScheduler({
    requestAnimationFrameRef = globalThis.requestAnimationFrame,
    cancelAnimationFrameRef = globalThis.cancelAnimationFrame,
} = {}) {
    let frameHandle = null;
    let pendingCallback = null;

    const cancel = () => {
        if (frameHandle !== null && typeof cancelAnimationFrameRef === 'function') {
            cancelAnimationFrameRef(frameHandle);
        }

        frameHandle = null;
        pendingCallback = null;
    };

    const request = (callback) => {
        if (typeof callback !== 'function' || typeof requestAnimationFrameRef !== 'function') {
            return;
        }

        pendingCallback = callback;

        if (frameHandle !== null) {
            return;
        }

        frameHandle = requestAnimationFrameRef(() => {
            const callbackToRun = pendingCallback;
            frameHandle = null;
            pendingCallback = null;
            callbackToRun?.();
        });
    };

    return { request, cancel };
}

/**
 * Runs repeated settle work after animation frames.
 * @param {() => void} callback Work to run after each frame.
 * @param {object} [options] Options.
 * @param {number} [options.frames=8] Number of frames to wait for.
 * @param {(callback: FrameRequestCallback) => number|void} [options.requestAnimationFrameRef] Frame scheduler.
 */
export async function runSettledFrames(callback, {
    frames = 8,
    requestAnimationFrameRef = globalThis.requestAnimationFrame,
} = {}) {
    if (typeof callback !== 'function' || typeof requestAnimationFrameRef !== 'function') {
        return;
    }

    for (let index = 0; index < frames; index++) {
        await new Promise(resolve => requestAnimationFrameRef(resolve));
        callback();
    }
}
