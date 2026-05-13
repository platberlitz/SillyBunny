import { jest } from '@jest/globals';
import {
    markOldExtensionWarningDismissed,
    oldExtensionWarningStorageKey,
    shouldWarnOldExtensionDeprecated,
} from '../public/scripts/extensions/guided-generations/scripts/legacyForkWarning.js';

describe('Guided Generations legacy fork warning', () => {
    const oldExtensionName = 'third-party/GuidedGenerations-Extension';

    function createStorage(value = null) {
        return {
            getItem: jest.fn(() => value),
            setItem: jest.fn(),
        };
    }

    test('does not warn from migrated settings when the fork is uninstalled', () => {
        expect(shouldWarnOldExtensionDeprecated([], oldExtensionName, createStorage())).toBe(false);
    });

    test('warns when a separate Guided Generations fork is still installed', () => {
        expect(shouldWarnOldExtensionDeprecated([oldExtensionName], oldExtensionName, createStorage())).toBe(true);
    });

    test('keeps warning until the user explicitly dismisses it', () => {
        const storage = createStorage();
        markOldExtensionWarningDismissed(storage);

        expect(storage.setItem).toHaveBeenCalledWith(oldExtensionWarningStorageKey, 'true');
    });

    test('does not warn after explicit dismissal', () => {
        expect(shouldWarnOldExtensionDeprecated([oldExtensionName], oldExtensionName, createStorage('true'))).toBe(false);
    });
});
