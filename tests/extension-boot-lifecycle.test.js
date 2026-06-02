import { describe, expect, test } from '@jest/globals';

import {
    createExtensionBootLifecycle,
    EXTENSION_BOOT_ACTIVATION_ACTION,
    normalizeExtensionBootId,
    resolveExtensionActivationState,
    resolveExtensionManifestRegistration,
    sortExtensionBootEntries,
} from '../public/scripts/extension-boot-lifecycle/index.js';

describe('extension boot lifecycle helper', () => {
    test('normalizes third-party extension ids for dedupe comparisons', () => {
        expect(normalizeExtensionBootId(' third-party/Foo-Bar ')).toBe('foo-bar');
        expect(normalizeExtensionBootId('Foo-Bar')).toBe('foo-bar');
        expect(normalizeExtensionBootId(null)).toBe('');
    });

    test('resolves manifest registration and duplicate entries', () => {
        expect(resolveExtensionManifestRegistration({
            name: 'third-party/gallery',
            existingKeys: ['tts'],
        })).toEqual({
            dedupeKey: 'gallery',
            isDuplicate: false,
            shouldRegister: true,
        });

        expect(resolveExtensionManifestRegistration({
            name: 'gallery',
            existingKeys: ['gallery'],
        })).toEqual({
            dedupeKey: 'gallery',
            isDuplicate: true,
            shouldRegister: false,
        });
    });

    test('sorts manifest entries by loading order then display name', () => {
        const entries = [
            ['third', { loading_order: 10, display_name: 'Zeta' }],
            ['first', { loading_order: 1, display_name: 'Beta' }],
            ['second', { loading_order: 1, display_name: 'Alpha' }],
        ];

        expect(sortExtensionBootEntries(entries).map(([name]) => name)).toEqual(['second', 'first', 'third']);
    });

    test('activates eligible extensions and waits when dependencies exist', () => {
        expect(resolveExtensionActivationState({
            name: 'child',
            manifest: {
                display_name: 'Child Extension',
                requires: ['caption'],
                dependencies: ['parent'],
            },
            availableModules: ['caption'],
            availableExtensionNames: ['parent', 'child'],
            clientVersionMeetsMinimum: true,
        })).toEqual(expect.objectContaining({
            action: EXTENSION_BOOT_ACTIVATION_ACTION.ACTIVATE,
            displayName: 'Child Extension',
            dedupeKey: 'child',
            shouldActivate: true,
            shouldWarn: false,
            shouldWaitForDependencyActivations: true,
            missingModules: [],
            missingDependencies: [],
            disabledDependencies: [],
        }));
    });

    test('skips active, activating, deduped, or disabled extensions without warnings', () => {
        expect(resolveExtensionActivationState({
            name: 'vectors',
            manifest: {},
            isActive: true,
        })).toMatchObject({
            action: EXTENSION_BOOT_ACTIVATION_ACTION.SKIP,
            shouldSkip: true,
            shouldWarn: false,
        });

        expect(resolveExtensionActivationState({
            name: 'vectors',
            manifest: {},
            isDisabled: true,
        })).toMatchObject({
            action: EXTENSION_BOOT_ACTIVATION_ACTION.SKIP,
            shouldSkip: true,
            shouldWarn: false,
        });

        expect(resolveExtensionActivationState({
            name: 'third-party/vectors',
            manifest: {},
            isDedupeActivating: true,
        })).toMatchObject({
            action: EXTENSION_BOOT_ACTIVATION_ACTION.SKIP,
            dedupeKey: 'vectors',
            shouldSkip: true,
        });
    });

    test('warns for missing Extras modules', () => {
        expect(resolveExtensionActivationState({
            name: 'caption',
            manifest: { requires: ['captioning'] },
            availableModules: [],
        })).toMatchObject({
            action: EXTENSION_BOOT_ACTIVATION_ACTION.MISSING_MODULES,
            shouldActivate: false,
            shouldWarn: true,
            missingModules: ['captioning'],
        });
    });

    test('warns for disabled dependencies before missing dependency fallback', () => {
        expect(resolveExtensionActivationState({
            name: 'child',
            manifest: { dependencies: ['parent'] },
            availableExtensionNames: ['child', 'parent'],
            disabledDependencyNames: ['parent'],
        })).toMatchObject({
            action: EXTENSION_BOOT_ACTIVATION_ACTION.DISABLED_DEPENDENCIES,
            shouldWarn: true,
            disabledDependencies: ['parent'],
        });
    });

    test('warns for missing extension dependencies', () => {
        expect(resolveExtensionActivationState({
            name: 'child',
            manifest: { dependencies: ['parent'] },
            availableExtensionNames: ['child'],
        })).toMatchObject({
            action: EXTENSION_BOOT_ACTIVATION_ACTION.MISSING_DEPENDENCIES,
            shouldWarn: true,
            missingDependencies: ['parent'],
        });
    });

    test('warns for unsupported client versions', () => {
        expect(resolveExtensionActivationState({
            name: 'future',
            manifest: { minimum_client_version: '999.0.0' },
            clientVersionMeetsMinimum: false,
        })).toMatchObject({
            action: EXTENSION_BOOT_ACTIVATION_ACTION.CLIENT_VERSION_UNSUPPORTED,
            shouldActivate: false,
            shouldWarn: true,
        });
    });

    test('flags invalid manifest requirement shapes while preserving legacy activation', () => {
        expect(resolveExtensionActivationState({
            name: 'legacy',
            manifest: {
                requires: 'caption',
                dependencies: 'parent',
            },
        })).toMatchObject({
            action: EXTENSION_BOOT_ACTIVATION_ACTION.ACTIVATE,
            invalidRequires: true,
            invalidDependencies: true,
            shouldActivate: true,
        });
    });

    test('creates a stable lifecycle seam for future runtime wiring', () => {
        const lifecycle = createExtensionBootLifecycle();

        expect(lifecycle.action).toBe(EXTENSION_BOOT_ACTIVATION_ACTION);
        expect(lifecycle.normalizeId).toBe(normalizeExtensionBootId);
        expect(lifecycle.resolveManifestRegistration).toBe(resolveExtensionManifestRegistration);
        expect(lifecycle.sortEntries).toBe(sortExtensionBootEntries);
        expect(lifecycle.resolveActivationState).toBe(resolveExtensionActivationState);
    });
});
