function assertResizeObserverOptions({ ResizeObserverImpl, onResize }) {
    if (typeof ResizeObserverImpl !== 'function') {
        throw new TypeError('createDelegatedResizeObserver requires ResizeObserverImpl to be a constructor.');
    }

    if (typeof onResize !== 'function') {
        throw new TypeError('createDelegatedResizeObserver requires onResize to be a function.');
    }
}

/**
 * Creates one delegated resize observer for late-growing chat message surfaces.
 * Scroll policy and anchor restoration stay with the runtime route that handles callbacks.
 * @param {object} options Options.
 * @param {ResizeObserver} [options.ResizeObserverImpl=globalThis.ResizeObserver] ResizeObserver constructor.
 * @param {(element: Element, entry: ResizeObserverEntry, metadata: object) => void} options.onResize Resize callback.
 * @returns {{observe: (element: Element, metadata?: object) => boolean, unobserve: (element: Element) => boolean, dispose: () => void}}
 */
export function createDelegatedResizeObserver({
    ResizeObserverImpl = globalThis.ResizeObserver,
    onResize,
} = {}) {
    assertResizeObserverOptions({ ResizeObserverImpl, onResize });

    const observedElements = new Map();
    const observer = new ResizeObserverImpl(entries => {
        for (const entry of entries) {
            if (!observedElements.has(entry.target)) {
                continue;
            }

            onResize(entry.target, entry, observedElements.get(entry.target));
        }
    });

    const observe = (element, metadata = {}) => {
        if (!element || observedElements.has(element)) {
            return false;
        }

        observedElements.set(element, metadata);
        observer.observe(element);
        return true;
    };

    const unobserve = (element) => {
        if (!observedElements.has(element)) {
            return false;
        }

        observedElements.delete(element);
        observer.unobserve(element);
        return true;
    };

    const dispose = () => {
        observedElements.clear();
        observer.disconnect();
    };

    return {
        observe,
        unobserve,
        dispose,
    };
}
