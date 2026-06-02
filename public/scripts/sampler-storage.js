export const SELECTED_SAMPLERS_STORAGE_KEY = 'selectedSamplers';
export const SELECTED_SAMPLERS_STORAGE_TIMEOUT_MS = 1500;

function normalizeSelectedSamplers(value, fallback = {}) {
    return value && typeof value === 'object' ? value : fallback;
}

export async function loadStoredSelectedSamplers(objectStore, {
    timeoutMs = SELECTED_SAMPLERS_STORAGE_TIMEOUT_MS,
    fallback = {},
} = {}) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Timed out loading selected sampler settings after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        const value = await Promise.race([
            objectStore.getItem(SELECTED_SAMPLERS_STORAGE_KEY),
            timeoutPromise,
        ]);
        return normalizeSelectedSamplers(value, fallback);
    } finally {
        clearTimeout(timeoutId);
    }
}
