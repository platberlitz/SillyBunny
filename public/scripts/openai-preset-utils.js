/**
 * Builds a Chat Completion preset body from live settings and the OpenAI settings map.
 * The default preserves legacy behavior by including connection fields.
 *
 * @param {Record<string, any>} settings Live OpenAI settings
 * @param {Record<string, [string, string, boolean, boolean]>} settingsMap OpenAI preset setting map
 * @param {object} [options] Build options
 * @param {boolean} [options.includeConnection=true] Whether to include provider/model/API fields
 * @returns {Record<string, any>} Preset body
 */
export function buildChatCompletionPreset(settings, settingsMap, { includeConnection = true } = {}) {
    const presetBody = {};

    for (const [presetKey, [, settingsKey, , isConnection]] of Object.entries(settingsMap ?? {})) {
        if (isConnection && !includeConnection) {
            continue;
        }

        presetBody[presetKey] = settings?.[settingsKey];
    }

    return structuredClone(presetBody);
}

/**
 * Lists preset keys that represent provider/model/API connection state.
 *
 * @param {Record<string, [string, string, boolean, boolean]>} settingsMap OpenAI preset setting map
 * @returns {string[]} Preset keys that should be treated as connection fields
 */
export function getChatCompletionConnectionPresetKeys(settingsMap) {
    return Object.entries(settingsMap ?? {})
        .filter(([, [, , , isConnection]]) => isConnection)
        .map(([presetKey]) => presetKey);
}

/**
 * Returns whether OpenAI preset saves should include provider/model/API fields.
 *
 * @param {Record<string, any>} settings Live OpenAI settings
 * @returns {boolean} True when linked preset mode is enabled
 */
export function shouldIncludeConnectionFieldsInPreset(settings) {
    return Boolean(settings?.bind_preset_to_connection);
}
