function assertApplyUpdate(applyUpdate) {
    if (typeof applyUpdate !== 'function') {
        throw new TypeError('createMessageUpdateQueue requires applyUpdate to be a function.');
    }
}

function normalizeQueueOptions({ rerenderMessage = true, ...restOptions } = {}) {
    return {
        ...restOptions,
        rerenderMessage: Boolean(rerenderMessage),
    };
}

/**
 * Creates a coalescing queue for already-decided message-block update requests.
 * The injected apply function remains the only message-block mutation surface.
 * @param {object} options Options.
 * @param {(messageId: number|string, message: object, options: object) => void} options.applyUpdate Message update applier.
 * @returns {{queue: (messageId: number|string, message: object, options?: object) => number, flush: () => number, clear: () => void, size: () => number}}
 */
export function createMessageUpdateQueue({ applyUpdate } = {}) {
    assertApplyUpdate(applyUpdate);

    const pendingUpdates = new Map();

    const queue = (messageId, message, options = {}) => {
        const normalizedOptions = normalizeQueueOptions(options);
        const previousUpdate = pendingUpdates.get(messageId);

        pendingUpdates.set(messageId, {
            message,
            options: {
                ...previousUpdate?.options,
                ...normalizedOptions,
                rerenderMessage: Boolean(previousUpdate?.options?.rerenderMessage || normalizedOptions.rerenderMessage),
            },
        });

        return pendingUpdates.size;
    };

    const flush = () => {
        const updates = [...pendingUpdates.entries()];
        pendingUpdates.clear();

        for (const [messageId, { message, options }] of updates) {
            applyUpdate(messageId, message, options);
        }

        return updates.length;
    };

    const clear = () => pendingUpdates.clear();
    const size = () => pendingUpdates.size;

    return {
        queue,
        flush,
        clear,
        size,
    };
}
