import { eventSource, event_types, main_api } from '../../../../script.js';
import { extension_settings, getContext } from '../../../extensions.js';
import { getPresetManager } from '../../../preset-manager.js';

const extensionName = 'guided-generations';
const NONE_PROFILE = '<None>';

function debugLog(...args) {
    if (extension_settings[extensionName]?.debugMode) {
        console.log(`[${extensionName}][DEBUG]`, ...args);
    }
}

function debugWarn(...args) {
    if (extension_settings[extensionName]?.debugMode) {
        console.warn(`[${extensionName}][DEBUG]`, ...args);
    }
}

function normalizeApiType(apiType = '') {
    const value = String(apiType || '').trim();
    if (!value) {
        return main_api === 'koboldhorde' ? 'kobold' : main_api;
    }

    if (value === 'koboldhorde') {
        return 'kobold';
    }

    return value;
}

function quoteSlashArg(value) {
    return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`;
}

function makeCommandArg(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r?\n/g, ' ');
}

function getConnectionManagerSettings() {
    return extension_settings.connectionManager ?? getContext()?.extensionSettings?.connectionManager ?? {};
}

function getProfileByName(profileName) {
    const profiles = getConnectionManagerSettings().profiles;
    if (!Array.isArray(profiles)) {
        return null;
    }

    return profiles.find(profile => profile.name === profileName) ?? null;
}

async function getCurrentProfile() {
    const settings = getConnectionManagerSettings();
    const profiles = settings.profiles;
    if (!settings.selectedProfile || !Array.isArray(profiles)) {
        return '';
    }

    return profiles.find(profile => profile.id === settings.selectedProfile)?.name ?? '';
}

async function getProfileList() {
    const profiles = getConnectionManagerSettings().profiles;
    return Array.isArray(profiles) ? profiles.map(profile => profile.name).filter(Boolean) : [];
}

async function getProfileApiType(profileName) {
    if (!profileName) {
        return normalizeApiType();
    }

    const profile = getProfileByName(profileName);
    if (!profile) {
        return normalizeApiType();
    }

    if (profile.api) {
        const apiKey = String(profile.api);
        if (apiKey === 'chatcompletion') {
            return 'openai';
        }

        return normalizeApiType(apiKey);
    }

    return profile.mode === 'cc' ? 'openai' : normalizeApiType();
}

async function getPresetsForApiType(apiType) {
    const manager = getPresetManager(normalizeApiType(apiType));
    return manager?.getAllPresets?.() ?? [];
}

function getCurrentPresetName(apiType = '') {
    const manager = getPresetManager(normalizeApiType(apiType));
    return manager?.getSelectedPresetName?.() ?? '';
}

async function selectPresetByName(presetName, apiType = '') {
    if (!presetName) {
        return false;
    }

    const manager = getPresetManager(normalizeApiType(apiType));
    if (!manager) {
        debugWarn(`[${extensionName}] Preset manager not found for API type: ${apiType || main_api}`);
        return false;
    }

    const presetValue = manager.findPreset(presetName);
    if (presetValue === undefined || presetValue === null || presetValue === '') {
        debugWarn(`[${extensionName}] Preset not found: ${presetName}`);
        return false;
    }

    if (manager.getSelectedPresetName() === presetName) {
        return true;
    }

    await manager.selectPreset(presetValue);
    return true;
}

async function switchToProfile(profileName) {
    const target = profileName || NONE_PROFILE;
    const context = getContext();
    if (typeof context?.executeSlashCommandsWithOptions !== 'function') {
        return false;
    }

    const loaded = new Promise(resolve => {
        eventSource.once(event_types.CONNECTION_PROFILE_LOADED, resolve);
    });
    await context.executeSlashCommandsWithOptions(`/profile await=true ${quoteSlashArg(target)}`);
    await Promise.race([
        loaded,
        new Promise(resolve => setTimeout(resolve, 5000)),
    ]);
    return true;
}

async function handleSwitching(targetProfile = '', targetPreset = '', originalProfile = '') {
    const profileToRestore = originalProfile ?? await getCurrentProfile();
    const apiToRestore = normalizeApiType();
    const presetToRestore = getCurrentPresetName(apiToRestore);

    async function switchToTarget() {
        if (targetProfile && targetProfile !== profileToRestore) {
            debugLog(`[${extensionName}] Switching profile to: ${targetProfile}`);
            await switchToProfile(targetProfile);
        }

        if (targetPreset) {
            const apiType = await getProfileApiType(targetProfile || await getCurrentProfile());
            debugLog(`[${extensionName}] Switching preset to: ${targetPreset} (${apiType})`);
            if (targetProfile && targetPreset) {
                await getContext().executeSlashCommandsWithOptions(`/preset ${makeCommandArg(targetPreset)}`);
            } else {
                await selectPresetByName(targetPreset, apiType);
            }
        }
    }

    async function restore() {
        try {
            const currentProfile = await getCurrentProfile();
            if (targetProfile && currentProfile !== profileToRestore) {
                debugLog(`[${extensionName}] Restoring profile to: ${profileToRestore || NONE_PROFILE}`);
                await switchToProfile(profileToRestore);
            }

            if (targetPreset && presetToRestore) {
                debugLog(`[${extensionName}] Restoring preset to: ${presetToRestore} (${apiToRestore})`);
                await selectPresetByName(presetToRestore, apiToRestore);
            }
        } catch (error) {
            debugWarn(`[${extensionName}] Error while restoring profile or preset:`, error);
        }
    }

    return {
        switch: switchToTarget,
        restore,
        originalProfile: profileToRestore,
        originalPreset: presetToRestore,
    };
}

export {
    getCurrentProfile,
    getPresetsForApiType,
    getProfileApiType,
    getProfileList,
    handleSwitching,
};
