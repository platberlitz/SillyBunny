import { describe, test, expect, jest } from '@jest/globals';
import {
    SELECTED_SAMPLERS_STORAGE_KEY,
    loadStoredSelectedSamplers,
} from '../public/scripts/sampler-storage.js';

describe('loadStoredSelectedSamplers', () => {
    test('loads selected sampler settings from storage', async () => {
        const storedSamplers = { textgenerationwebui: { temp: true } };
        const objectStore = {
            getItem: jest.fn(async key => key === SELECTED_SAMPLERS_STORAGE_KEY ? storedSamplers : null),
        };

        await expect(loadStoredSelectedSamplers(objectStore)).resolves.toEqual(storedSamplers);
        expect(objectStore.getItem).toHaveBeenCalledWith(SELECTED_SAMPLERS_STORAGE_KEY);
    });

    test('falls back to empty selections when storage has no object', async () => {
        const objectStore = {
            getItem: jest.fn(async () => null),
        };

        await expect(loadStoredSelectedSamplers(objectStore)).resolves.toEqual({});
    });

    test('rejects when storage does not settle before the startup timeout', async () => {
        jest.useFakeTimers();

        try {
            const objectStore = {
                getItem: jest.fn(() => new Promise(() => {})),
            };
            const result = loadStoredSelectedSamplers(objectStore, { timeoutMs: 25 });
            const observedError = result.catch(error => error);

            await jest.advanceTimersByTimeAsync(25);
            await expect(observedError).resolves.toMatchObject({
                message: 'Timed out loading selected sampler settings after 25ms',
            });
        } finally {
            jest.useRealTimers();
        }
    });
});

describe('selected sampler save guard', () => {
    const mockTextGenObjectStore = {
        getItem: jest.fn(),
        setItem: jest.fn(),
    };

    beforeEach(() => {
        jest.resetModules();
        mockTextGenObjectStore.getItem.mockReset();
        mockTextGenObjectStore.setItem.mockReset();
    });

    async function importSamplerSelect() {
        await jest.unstable_mockModule('../public/script.js', () => ({
            main_api: 'textgenerationwebui',
            saveSettingsDebounced: jest.fn(),
        }));

        await jest.unstable_mockModule('../public/scripts/textgen-settings.js', () => ({
            setting_names: ['temperature'],
            showTGSamplerControls: jest.fn(),
            textgenerationwebui_settings: { type: 'ooba' },
        }));

        await jest.unstable_mockModule('../public/scripts/templates.js', () => ({
            renderTemplateAsync: jest.fn(async () => ''),
        }));

        await jest.unstable_mockModule('../public/scripts/popup.js', () => ({
            Popup: class Popup {},
            POPUP_TYPE: { TEXT: 1 },
        }));

        await jest.unstable_mockModule('../public/lib.js', () => ({
            localforage: {
                createInstance: jest.fn(() => mockTextGenObjectStore),
            },
        }));

        return import('../public/scripts/samplerSelect.js');
    }

    test('does not persist fallback sampler state after storage load timeout', async () => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        try {
            mockTextGenObjectStore.getItem.mockReturnValue(new Promise(() => {}));
            const {
                loadApiSelectedSamplers,
                saveApiSelectedSamplers,
                setApiSamplersState,
            } = await importSamplerSelect();

            const loadPromise = loadApiSelectedSamplers();
            await jest.advanceTimersByTimeAsync(1500);
            await loadPromise;

            setApiSamplersState('temperature', true, 'ooba');

            await expect(saveApiSelectedSamplers()).resolves.toBe(false);
            expect(mockTextGenObjectStore.setItem).not.toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
            console.log.mockRestore();
            console.warn.mockRestore();
        }
    });

    test('allows explicit preset sampler visibility saves after a storage timeout', async () => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});

        try {
            mockTextGenObjectStore.getItem.mockReturnValue(new Promise(() => {}));
            const {
                loadApiSelectedSamplers,
                saveApiSelectedSamplers,
                setApiSamplerVisibilityState,
            } = await importSamplerSelect();

            const loadPromise = loadApiSelectedSamplers();
            await jest.advanceTimersByTimeAsync(1500);
            await loadPromise;

            expect(setApiSamplerVisibilityState({ temperature: true }, 'ooba')).toBe(true);
            await expect(saveApiSelectedSamplers()).resolves.toBe(true);
            expect(mockTextGenObjectStore.setItem).toHaveBeenCalledWith('selectedSamplers', {
                ooba: { temperature: true },
            });
        } finally {
            jest.useRealTimers();
            console.log.mockRestore();
        }
    });

    test('does not arm the save guard when reset follows a storage timeout', async () => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        try {
            mockTextGenObjectStore.getItem.mockReturnValue(new Promise(() => {}));
            const {
                loadApiSelectedSamplers,
                resetApiSelectedSamplers,
                setApiSamplersState,
            } = await importSamplerSelect();

            const loadPromise = loadApiSelectedSamplers();
            await jest.advanceTimersByTimeAsync(1500);
            await loadPromise;

            setApiSamplersState('temperature', true, 'ooba');
            await resetApiSelectedSamplers('ooba', true);

            expect(mockTextGenObjectStore.setItem).not.toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
            console.log.mockRestore();
            console.warn.mockRestore();
        }
    });
});
