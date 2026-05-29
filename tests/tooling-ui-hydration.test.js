import { describe, expect, test } from '@jest/globals';

import {
    createToolingUiHydrationLifecycle,
    TOOLING_UI_HYDRATION_STATUS,
    buildToolingCaptureFilename,
    normalizeToolingCaptureRange,
    resolveLazyToolingLibraryHydration,
    resolveToolingAssetWait,
} from '../public/scripts/tooling-ui-hydration/index.js';

describe('tooling UI hydration helper', () => {
    test('resolves already-loaded lazy library state', () => {
        expect(resolveLazyToolingLibraryHydration({
            isLoaded: true,
            hasPendingLoad: true,
        })).toEqual({
            status: TOOLING_UI_HYDRATION_STATUS.READY,
            shouldLoad: false,
            shouldReusePendingLoad: false,
        });
    });

    test('reuses pending lazy library loads', () => {
        expect(resolveLazyToolingLibraryHydration({
            isLoaded: false,
            hasPendingLoad: true,
        })).toEqual({
            status: TOOLING_UI_HYDRATION_STATUS.REUSE_PENDING,
            shouldLoad: false,
            shouldReusePendingLoad: true,
        });
    });

    test('requests lazy library load when missing and not pending', () => {
        expect(resolveLazyToolingLibraryHydration()).toEqual({
            status: TOOLING_UI_HYDRATION_STATUS.LOAD,
            shouldLoad: true,
            shouldReusePendingLoad: false,
        });
    });

    test('normalizes inclusive capture ranges', () => {
        expect(normalizeToolingCaptureRange({
            startId: 4,
            endId: 2,
            maxId: 8,
        })).toEqual({
            startId: 2,
            endId: 4,
        });

        expect(normalizeToolingCaptureRange({
            startId: -1,
            endId: 2,
            maxId: 8,
        })).toBeNull();

        expect(normalizeToolingCaptureRange({
            startId: 2,
            endId: 9,
            maxId: 8,
        })).toBeNull();

        expect(normalizeToolingCaptureRange({
            startId: 2.5,
            endId: 3,
            maxId: 8,
        })).toBeNull();
    });

    test('builds sanitized capture filenames', () => {
        expect(buildToolingCaptureFilename({
            baseName: 'My Cool Chat!',
            startId: 3,
            endId: 3,
        })).toBe('my-cool-chat-message-3.png');

        expect(buildToolingCaptureFilename({
            baseName: '***',
            startId: 2,
            endId: 5,
        })).toBe('chat-messages-2-5.png');
    });

    test('waits for tooling assets only when assets exist', () => {
        expect(resolveToolingAssetWait({
            assetCount: 0,
            timeoutMs: 2000,
        })).toEqual({
            shouldWait: false,
            timeoutMs: 2000,
        });

        expect(resolveToolingAssetWait({
            assetCount: 3,
            timeoutMs: '1500',
        })).toEqual({
            shouldWait: true,
            timeoutMs: 1500,
        });
    });

    test('creates a stable lifecycle seam for future runtime wiring', () => {
        const lifecycle = createToolingUiHydrationLifecycle();

        expect(lifecycle.library.status).toBe(TOOLING_UI_HYDRATION_STATUS);
        expect(lifecycle.library.resolveHydration).toBe(resolveLazyToolingLibraryHydration);
        expect(lifecycle.capture.normalizeRange).toBe(normalizeToolingCaptureRange);
        expect(lifecycle.capture.buildFilename).toBe(buildToolingCaptureFilename);
        expect(lifecycle.capture.resolveAssetWait).toBe(resolveToolingAssetWait);
    });
});
