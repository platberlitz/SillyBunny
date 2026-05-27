export const CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY = 'sillybunny.chatRenderLifecycle.enabled';

function parseBooleanOverride(value) {
    if (value === true || value === 'true' || value === '1') {
        return true;
    }

    if (value === false || value === 'false' || value === '0') {
        return false;
    }

    return null;
}

function readStorageOverride(storage) {
    if (!storage || typeof storage.getItem !== 'function') {
        return null;
    }

    try {
        return parseBooleanOverride(storage.getItem(CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY));
    } catch {
        return null;
    }
}

/**
 * Resolves the temporary lifecycle rollout guard for future runtime routing.
 * @param {object} [options] Options.
 * @param {boolean} [options.defaultEnabled=false] Safe default until routes are proven.
 * @param {string|boolean|null} [options.queryValue] Explicit query override value.
 * @param {{getItem: (key: string) => string|null}|null} [options.storage] Storage override source.
 * @returns {{enabled: boolean, source: 'query'|'storage'|'default'}}
 */
export function resolveChatRenderLifecycleRollout({
    defaultEnabled = false,
    queryValue = null,
    storage = null,
} = {}) {
    const queryOverride = parseBooleanOverride(queryValue);

    if (queryOverride !== null) {
        return { enabled: queryOverride, source: 'query' };
    }

    const storageOverride = readStorageOverride(storage);

    if (storageOverride !== null) {
        return { enabled: storageOverride, source: 'storage' };
    }

    return { enabled: Boolean(defaultEnabled), source: 'default' };
}
