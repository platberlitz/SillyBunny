export const TOOLING_UI_HYDRATION_STATUS = Object.freeze({
    READY: 'ready',
    LOAD: 'load',
    REUSE_PENDING: 'reuse-pending',
});

function normalizeNumber(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

/**
 * Resolves lazy library hydration state without touching the DOM.
 * @param {object} options Options.
 * @param {boolean} [options.isLoaded=false] Whether library is already available.
 * @param {boolean} [options.hasPendingLoad=false] Whether a load promise already exists.
 * @returns {{status: string, shouldLoad: boolean, shouldReusePendingLoad: boolean}}
 */
export function resolveLazyToolingLibraryHydration({
    isLoaded = false,
    hasPendingLoad = false,
} = {}) {
    if (isLoaded) {
        return {
            status: TOOLING_UI_HYDRATION_STATUS.READY,
            shouldLoad: false,
            shouldReusePendingLoad: false,
        };
    }

    if (hasPendingLoad) {
        return {
            status: TOOLING_UI_HYDRATION_STATUS.REUSE_PENDING,
            shouldLoad: false,
            shouldReusePendingLoad: true,
        };
    }

    return {
        status: TOOLING_UI_HYDRATION_STATUS.LOAD,
        shouldLoad: true,
        shouldReusePendingLoad: false,
    };
}

/**
 * Normalizes an inclusive tooling capture range.
 * @param {object} options Options.
 * @param {unknown} options.startId Start id.
 * @param {unknown} options.endId End id.
 * @param {number} options.maxId Maximum valid id.
 * @returns {{startId: number, endId: number}|null}
 */
export function normalizeToolingCaptureRange({
    startId,
    endId,
    maxId,
} = {}) {
    if (!Number.isInteger(startId) || !Number.isInteger(endId) || !Number.isInteger(maxId)) {
        return null;
    }

    const normalizedStart = Math.min(startId, endId);
    const normalizedEnd = Math.max(startId, endId);

    if (normalizedStart < 0 || normalizedEnd > maxId) {
        return null;
    }

    return {
        startId: normalizedStart,
        endId: normalizedEnd,
    };
}

/**
 * Builds a stable filename for a tooling capture.
 * @param {object} options Options.
 * @param {unknown} [options.baseName='chat'] Capture source name.
 * @param {number} options.startId Start id.
 * @param {number} options.endId End id.
 * @returns {string} PNG filename.
 */
export function buildToolingCaptureFilename({
    baseName = 'chat',
    startId,
    endId,
} = {}) {
    const safeBaseName = String(baseName ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'chat';
    const rangeLabel = startId === endId ? `message-${startId}` : `messages-${startId}-${endId}`;

    return `${safeBaseName}-${rangeLabel}.png`;
}

/**
 * Resolves whether tooling capture should wait for assets and for how long.
 * @param {object} options Options.
 * @param {unknown} [options.assetCount=0] Number of assets in the capture surface.
 * @param {unknown} [options.timeoutMs=2000] Maximum wait time.
 * @returns {{shouldWait: boolean, timeoutMs: number}}
 */
export function resolveToolingAssetWait({
    assetCount = 0,
    timeoutMs = 2000,
} = {}) {
    const normalizedAssetCount = Math.max(0, normalizeNumber(assetCount) ?? 0);
    const normalizedTimeoutMs = Math.max(0, normalizeNumber(timeoutMs) ?? 0);

    return {
        shouldWait: normalizedAssetCount > 0,
        timeoutMs: normalizedTimeoutMs,
    };
}

/**
 * Creates the compatibility-facing tooling UI hydration seam.
 * Runtime call sites should depend on this shape instead of individual helpers.
 * @returns {object}
 */
export function createToolingUiHydrationLifecycle() {
    return {
        library: {
            status: TOOLING_UI_HYDRATION_STATUS,
            resolveHydration: resolveLazyToolingLibraryHydration,
        },
        capture: {
            normalizeRange: normalizeToolingCaptureRange,
            buildFilename: buildToolingCaptureFilename,
            resolveAssetWait: resolveToolingAssetWait,
        },
    };
}
