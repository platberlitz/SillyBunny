export const DEFAULT_SCROLL_EDGE_SETTLE_DELAYS = Object.freeze([80, 250, 400]);
const NOOP_CANCEL_SCROLL_EDGE_JUMP = () => undefined;

function toFiniteScrollSize(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

export function getScrollEdgePosition(scrollElement, edge) {
    if (!scrollElement || typeof scrollElement !== 'object') {
        return 0;
    }

    if (edge !== 'bottom') {
        return 0;
    }

    const scrollHeight = toFiniteScrollSize(scrollElement.scrollHeight);
    const clientHeight = toFiniteScrollSize(scrollElement.clientHeight);
    return Math.max(0, scrollHeight - clientHeight);
}

export function jumpScrollElementToEdge(scrollElement, edge, {
    requestAnimationFrameRef = globalThis.requestAnimationFrame,
    cancelAnimationFrameRef = globalThis.cancelAnimationFrame,
    setTimeoutRef = globalThis.setTimeout,
    clearTimeoutRef = globalThis.clearTimeout,
    settleDelays = [],
} = {}) {
    if (!scrollElement || typeof scrollElement !== 'object') {
        return NOOP_CANCEL_SCROLL_EDGE_JUMP;
    }

    let cancelled = false;
    let frameId = null;
    const timeoutIds = [];

    const cancel = () => {
        if (cancelled) {
            return;
        }

        cancelled = true;

        if (frameId !== null && typeof cancelAnimationFrameRef === 'function') {
            cancelAnimationFrameRef(frameId);
        }

        if (typeof clearTimeoutRef === 'function') {
            for (const timeoutId of timeoutIds) {
                clearTimeoutRef(timeoutId);
            }
        }

        frameId = null;
        timeoutIds.length = 0;
    };

    const jump = () => {
        if (cancelled) {
            return;
        }

        scrollElement.scrollTop = getScrollEdgePosition(scrollElement, edge);
    };

    jump();

    if (typeof requestAnimationFrameRef === 'function') {
        frameId = requestAnimationFrameRef(jump);
    }

    if (typeof setTimeoutRef === 'function' && Array.isArray(settleDelays)) {
        for (const delay of settleDelays) {
            const delayMs = Math.max(0, toFiniteScrollSize(delay));
            timeoutIds.push(setTimeoutRef(jump, delayMs));
        }
    }

    return cancel;
}
