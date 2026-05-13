const oldExtensionWarningStorageKey = 'guided_generations_legacy_fork_warning_v1';

function isOldExtensionInstalled(extensionNames, oldExtensionName) {
    return extensionNames.some(name => String(name).toLowerCase() === oldExtensionName.toLowerCase());
}

function shouldWarnOldExtensionDeprecated(extensionNames, oldExtensionName, storage = globalThis.localStorage) {
    return isOldExtensionInstalled(extensionNames, oldExtensionName)
        && storage?.getItem?.(oldExtensionWarningStorageKey) !== 'true';
}

function markOldExtensionWarningDismissed(storage = globalThis.localStorage) {
    storage?.setItem?.(oldExtensionWarningStorageKey, 'true');
}

export {
    isOldExtensionInstalled,
    markOldExtensionWarningDismissed,
    oldExtensionWarningStorageKey,
    shouldWarnOldExtensionDeprecated,
};
