const TRUE_VALUES = new Set(['true', '1', 'on', 'yes', 'enabled']);
const FALSE_VALUES = new Set(['false', '0', 'off', 'no', 'disabled']);

/**
 * Coerces common boolean-ish values used by extension settings and slash commands.
 * @param {unknown} value Value to coerce.
 * @returns {boolean} Coerced boolean value.
 */
export function coerceVectorBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (TRUE_VALUES.has(normalized)) {
            return true;
        }

        if (FALSE_VALUES.has(normalized)) {
            return false;
        }
    }

    return Boolean(value);
}

/**
 * Applies the deprecated aggregate `enabled` flag to the chat RAG flag.
 * @param {Record<string, any>} settings Runtime vector settings.
 * @param {Record<string, any>} [savedSettings={}] Saved vector settings.
 * @returns {Record<string, any>} Mutated runtime settings.
 */
export function applyLegacyVectorEnabledSetting(settings, savedSettings = {}) {
    const legacyValue = Object.hasOwn(savedSettings, 'enabled') ? savedSettings.enabled : settings.enabled;

    if (coerceVectorBoolean(legacyValue)) {
        settings.enabled_chats = true;
    }

    return settings;
}

/**
 * Removes the deprecated runtime `enabled` flag after migration so stale values
 * cannot overwrite the scoped enable flags through the compatibility setter.
 * @param {Record<string, any>} settings Runtime vector settings.
 * @returns {Record<string, any>} Mutated runtime settings.
 */
export function stripLegacyVectorEnabledSetting(settings) {
    delete settings.enabled;
    return settings;
}

/**
 * Gets vector settings that are safe to copy into the saved settings store.
 * @param {Record<string, any>} settings Runtime vector settings.
 * @returns {Record<string, any>} Persistable settings without deprecated runtime aliases.
 */
export function getPersistableVectorSettings(settings) {
    const persistableSettings = { ...settings };
    stripLegacyVectorEnabledSetting(persistableSettings);
    return persistableSettings;
}

/**
 * Normalizes extension-facing RAG enable options to the internal vector flags.
 * @param {unknown} options Enable options.
 * @returns {Partial<{enabled_chats: boolean, enabled_files: boolean, enabled_world_info: boolean}>}
 */
export function normalizeVectorEnabledOptions(options = true) {
    if (options === undefined || options === null || options === true) {
        return { enabled_chats: true };
    }

    if (options === false || typeof options !== 'object') {
        return { enabled_chats: coerceVectorBoolean(options) };
    }

    const source = /** @type {Record<string, any>} */ (options);
    const normalized = {};
    const assignBoolean = (targetKey, ...sourceKeys) => {
        for (const sourceKey of sourceKeys) {
            if (Object.hasOwn(source, sourceKey)) {
                normalized[targetKey] = coerceVectorBoolean(source[sourceKey]);
                return;
            }
        }
    };

    assignBoolean('enabled_chats', 'enabled_chats', 'chats', 'chat', 'messages', 'enabled');
    assignBoolean('enabled_files', 'enabled_files', 'files', 'file', 'attachments', 'dataBank', 'data_bank');
    assignBoolean('enabled_world_info', 'enabled_world_info', 'worldInfo', 'world_info', 'world', 'wi');

    return normalized;
}

/**
 * Gets the extension-facing enabled state for Vector Storage/RAG.
 * @param {Record<string, any>} settings Runtime vector settings.
 * @returns {{enabled: boolean, chats: boolean, files: boolean, worldInfo: boolean, enabled_chats: boolean, enabled_files: boolean, enabled_world_info: boolean}}
 */
export function getVectorEnabledState(settings) {
    const chats = !!settings.enabled_chats;
    const files = !!settings.enabled_files;
    const worldInfo = !!settings.enabled_world_info;

    return {
        enabled: chats,
        chats,
        files,
        worldInfo,
        enabled_chats: chats,
        enabled_files: files,
        enabled_world_info: worldInfo,
    };
}

/**
 * Binds extension-facing enabled flags to the live Vector Storage runtime settings.
 * @param {Record<string, any>} settings Runtime vector settings.
 * @param {Record<string, any>} store Saved extension settings object.
 * @param {() => void} [onChange] Change callback.
 * @returns {Record<string, any>} Bound saved settings object.
 */
export function bindVectorEnabledSettingsStore(settings, store, onChange = () => {}) {
    const bindSettingProperty = (key) => {
        const currentValue = Object.hasOwn(store, key) ? store[key] : settings[key];
        settings[key] = coerceVectorBoolean(currentValue);

        Object.defineProperty(store, key, {
            configurable: true,
            enumerable: true,
            get: () => settings[key],
            set: (value) => {
                settings[key] = coerceVectorBoolean(value);
                onChange();
            },
        });
    };

    const legacyValue = Object.hasOwn(store, 'enabled') ? store.enabled : undefined;

    bindSettingProperty('enabled_chats');
    bindSettingProperty('enabled_files');
    bindSettingProperty('enabled_world_info');

    if (coerceVectorBoolean(legacyValue)) {
        settings.enabled_chats = true;
    }

    Object.defineProperty(store, 'enabled', {
        configurable: true,
        enumerable: true,
        get: () => !!settings.enabled_chats,
        set: (value) => {
            settings.enabled_chats = coerceVectorBoolean(value);
            onChange();
        },
    });

    return store;
}
