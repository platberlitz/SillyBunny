export const EXTENSION_BOOT_ACTIVATION_ACTION = Object.freeze({
    ACTIVATE: 'activate',
    SKIP: 'skip',
    MISSING_MODULES: 'missing-modules',
    MISSING_DEPENDENCIES: 'missing-dependencies',
    DISABLED_DEPENDENCIES: 'disabled-dependencies',
    CLIENT_VERSION_UNSUPPORTED: 'client-version-unsupported',
});

function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
}

/**
 * Normalizes an extension id for duplicate/disabled comparisons.
 * @param {unknown} name Extension id.
 * @returns {string} Normalized extension id.
 */
export function normalizeExtensionBootId(name) {
    return String(name || '')
        .trim()
        .replace(/^third-party\//i, '')
        .toLowerCase();
}

/**
 * Resolves whether a discovered extension manifest should be registered.
 * @param {object} options Options.
 * @param {unknown} options.name Extension id.
 * @param {Iterable<string>} [options.existingKeys=[]] Already loaded normalized ids.
 * @returns {{dedupeKey: string, shouldRegister: boolean, isDuplicate: boolean}}
 */
export function resolveExtensionManifestRegistration({
    name,
    existingKeys = [],
} = {}) {
    const dedupeKey = normalizeExtensionBootId(name);
    const keySet = new Set(existingKeys);
    const isDuplicate = keySet.has(dedupeKey);

    return {
        dedupeKey,
        isDuplicate,
        shouldRegister: Boolean(dedupeKey) && !isDuplicate,
    };
}

/**
 * Sorts extension manifest entries by loading order, then display name.
 * @param {[string, object][]} entries Manifest entries.
 * @returns {[string, object][]} Sorted entries copy.
 */
export function sortExtensionBootEntries(entries = []) {
    return normalizeArray(entries).slice().sort((left, right) => {
        const leftManifest = left?.[1] ?? {};
        const rightManifest = right?.[1] ?? {};
        return Number.parseInt(leftManifest.loading_order) - Number.parseInt(rightManifest.loading_order)
            || String(leftManifest.display_name).localeCompare(String(rightManifest.display_name));
    });
}

/**
 * Resolves extension activation eligibility from manifest and runtime facts.
 * @param {object} options Options.
 * @param {unknown} options.name Extension id.
 * @param {object} [options.manifest={}] Extension manifest.
 * @param {string[]} [options.availableModules=[]] Extras modules available at boot.
 * @param {string[]} [options.availableExtensionNames=[]] Discovered extension ids.
 * @param {string[]} [options.disabledDependencyNames=[]] Dependencies currently disabled.
 * @param {boolean} [options.clientVersionMeetsMinimum=true] Whether client version satisfies manifest.
 * @param {boolean} [options.isDisabled=false] Whether this extension is disabled.
 * @param {boolean} [options.isActive=false] Whether exact extension id is already active.
 * @param {boolean} [options.isDedupeActive=false] Whether normalized id is already active.
 * @param {boolean} [options.isDedupeActivating=false] Whether normalized id is activating.
 * @returns {{action: string, dedupeKey: string, displayName: string, shouldActivate: boolean, shouldWarn: boolean, shouldWaitForDependencyActivations: boolean, shouldSkip: boolean, invalidRequires: boolean, invalidDependencies: boolean, missingModules: string[], missingDependencies: string[], disabledDependencies: string[]}}
 */
export function resolveExtensionActivationState({
    name,
    manifest = {},
    availableModules = [],
    availableExtensionNames = [],
    disabledDependencyNames = [],
    clientVersionMeetsMinimum = true,
    isDisabled = false,
    isActive = false,
    isDedupeActive = false,
    isDedupeActivating = false,
} = {}) {
    const dedupeKey = normalizeExtensionBootId(name);
    const displayName = manifest?.display_name || name;
    const extrasRequirements = manifest?.requires;
    const extensionDependencies = manifest?.dependencies;
    const hasDependencies = Array.isArray(extensionDependencies) && extensionDependencies.length > 0;
    const invalidRequires = extrasRequirements !== undefined && !Array.isArray(extrasRequirements);
    const invalidDependencies = extensionDependencies !== undefined && !Array.isArray(extensionDependencies);
    const missingModules = Array.isArray(extrasRequirements)
        ? extrasRequirements.filter(req => !availableModules.includes(req))
        : [];
    const missingDependencies = Array.isArray(extensionDependencies)
        ? extensionDependencies.filter(dep => !availableExtensionNames.includes(dep))
        : [];
    const disabledDependencies = Array.isArray(extensionDependencies)
        ? extensionDependencies.filter(dep => disabledDependencyNames.includes(dep))
        : [];

    if (isActive || isDedupeActive || isDedupeActivating || isDisabled) {
        return {
            action: EXTENSION_BOOT_ACTIVATION_ACTION.SKIP,
            dedupeKey,
            displayName,
            shouldActivate: false,
            shouldWarn: false,
            shouldWaitForDependencyActivations: false,
            shouldSkip: true,
            invalidRequires,
            invalidDependencies,
            missingModules,
            missingDependencies,
            disabledDependencies,
        };
    }

    if (missingModules.length > 0) {
        return {
            action: EXTENSION_BOOT_ACTIVATION_ACTION.MISSING_MODULES,
            dedupeKey,
            displayName,
            shouldActivate: false,
            shouldWarn: true,
            shouldWaitForDependencyActivations: false,
            shouldSkip: false,
            invalidRequires,
            invalidDependencies,
            missingModules,
            missingDependencies,
            disabledDependencies,
        };
    }

    if (disabledDependencies.length > 0) {
        return {
            action: EXTENSION_BOOT_ACTIVATION_ACTION.DISABLED_DEPENDENCIES,
            dedupeKey,
            displayName,
            shouldActivate: false,
            shouldWarn: true,
            shouldWaitForDependencyActivations: false,
            shouldSkip: false,
            invalidRequires,
            invalidDependencies,
            missingModules,
            missingDependencies,
            disabledDependencies,
        };
    }

    if (missingDependencies.length > 0) {
        return {
            action: EXTENSION_BOOT_ACTIVATION_ACTION.MISSING_DEPENDENCIES,
            dedupeKey,
            displayName,
            shouldActivate: false,
            shouldWarn: true,
            shouldWaitForDependencyActivations: false,
            shouldSkip: false,
            invalidRequires,
            invalidDependencies,
            missingModules,
            missingDependencies,
            disabledDependencies,
        };
    }

    if (!clientVersionMeetsMinimum) {
        return {
            action: EXTENSION_BOOT_ACTIVATION_ACTION.CLIENT_VERSION_UNSUPPORTED,
            dedupeKey,
            displayName,
            shouldActivate: false,
            shouldWarn: true,
            shouldWaitForDependencyActivations: false,
            shouldSkip: false,
            invalidRequires,
            invalidDependencies,
            missingModules,
            missingDependencies,
            disabledDependencies,
        };
    }

    return {
        action: EXTENSION_BOOT_ACTIVATION_ACTION.ACTIVATE,
        dedupeKey,
        displayName,
        shouldActivate: true,
        shouldWarn: false,
        shouldWaitForDependencyActivations: hasDependencies,
        shouldSkip: false,
        invalidRequires,
        invalidDependencies,
        missingModules,
        missingDependencies,
        disabledDependencies,
    };
}

/**
 * Creates the compatibility-facing extension boot lifecycle seam.
 * Runtime call sites should depend on this shape instead of individual helpers.
 * @returns {object}
 */
export function createExtensionBootLifecycle() {
    return {
        action: EXTENSION_BOOT_ACTIVATION_ACTION,
        normalizeId: normalizeExtensionBootId,
        resolveManifestRegistration: resolveExtensionManifestRegistration,
        sortEntries: sortExtensionBootEntries,
        resolveActivationState: resolveExtensionActivationState,
    };
}
