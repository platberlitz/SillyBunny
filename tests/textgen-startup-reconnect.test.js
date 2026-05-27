import { describe, expect, test } from '@jest/globals';

import { shouldRestoreTextGenStatusOnStartup } from '../public/scripts/textgen-startup-status.js';

describe('textgen startup status restoration', () => {
    test('restores a saved llama.cpp endpoint after refresh', () => {
        expect(shouldRestoreTextGenStatusOnStartup({
            mainApi: 'textgenerationwebui',
            serverUrl: 'http://127.0.0.1:8080',
        })).toBe(true);
    });

    test('does not start a status check for empty or inactive textgen settings', () => {
        expect(shouldRestoreTextGenStatusOnStartup({
            mainApi: 'textgenerationwebui',
            serverUrl: '',
        })).toBe(false);
        expect(shouldRestoreTextGenStatusOnStartup({
            mainApi: 'openai',
            serverUrl: 'http://127.0.0.1:8080',
        })).toBe(false);
    });
});
