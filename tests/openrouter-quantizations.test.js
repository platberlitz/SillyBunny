import { beforeAll, describe, expect, test } from '@jest/globals';
import { fileURLToPath } from 'node:url';

import { setConfigFilePath } from '../src/util.js';

setConfigFilePath(fileURLToPath(new URL('../default/config.yaml', import.meta.url)));

describe('OpenRouter quantization parameters', () => {
    let shouldIncludeOpenRouterQuantizations;

    beforeAll(async () => {
        ({ shouldIncludeOpenRouterQuantizations } = await import('../src/endpoints/backends/chat-completions.js'));
    });

    test('includes quantizations for main chat requests', () => {
        expect(shouldIncludeOpenRouterQuantizations({
            quantizations: ['int4'],
        })).toBe(true);
    });

    test('omits quantizations for Connection Manager profile requests', () => {
        expect(shouldIncludeOpenRouterQuantizations({
            secret_id: 'profile-secret',
            quantizations: ['int4'],
        })).toBe(false);

        expect(shouldIncludeOpenRouterQuantizations({
            secret_id: '',
            quantizations: ['int4'],
        })).toBe(false);
    });

    test('omits quantizations when none are selected', () => {
        expect(shouldIncludeOpenRouterQuantizations({
            quantizations: [],
        })).toBe(false);

        expect(shouldIncludeOpenRouterQuantizations({})).toBe(false);
    });
});
