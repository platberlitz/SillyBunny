import { beforeAll, describe, expect, test } from '@jest/globals';
import { fileURLToPath } from 'node:url';

import { setConfigFilePath } from '../src/util.js';

setConfigFilePath(fileURLToPath(new URL('../default/config.yaml', import.meta.url)));

let getGoogleApiBaseUrl;

beforeAll(async () => {
    ({ getGoogleApiBaseUrl } = await import('../src/endpoints/google.js'));
});

describe('getGoogleApiBaseUrl', () => {
    test('appends configured version to the root Google AI Studio API URL', () => {
        expect(getGoogleApiBaseUrl('https://generativelanguage.googleapis.com', 'v1beta'))
            .toBe('https://generativelanguage.googleapis.com/v1beta');
    });

    test('appends configured version to a root proxy URL', () => {
        expect(getGoogleApiBaseUrl('https://proxy.example/gemini', 'v1beta'))
            .toBe('https://proxy.example/gemini/v1beta');
    });

    test('does not append a second version to a v1 proxy URL', () => {
        expect(getGoogleApiBaseUrl('https://proxy.example/v1', 'v1beta'))
            .toBe('https://proxy.example/v1');
    });

    test('trims a trailing slash from a v1beta proxy URL', () => {
        expect(getGoogleApiBaseUrl('https://proxy.example/v1beta/', 'v1beta'))
            .toBe('https://proxy.example/v1beta');
    });

    test('does not append a second version to a nested versioned proxy URL', () => {
        expect(getGoogleApiBaseUrl('https://proxy.example/google/v1', 'v1beta'))
            .toBe('https://proxy.example/google/v1');
    });

    test('does not append a second version to a Vertex v1 proxy URL', () => {
        expect(getGoogleApiBaseUrl('https://vertex-proxy.example/v1', 'v1'))
            .toBe('https://vertex-proxy.example/v1');
    });
});
