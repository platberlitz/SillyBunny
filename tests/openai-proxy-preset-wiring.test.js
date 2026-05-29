import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const openAiSource = readFileSync(path.join(repoRoot, 'public', 'scripts', 'openai.js'), 'utf8');

function getFunctionSource(name) {
    const marker = `function ${name}(`;
    const start = openAiSource.indexOf(marker);

    expect(start).toBeGreaterThanOrEqual(0);

    const bodyStart = openAiSource.indexOf(') {', start) + 2;
    let depth = 0;

    for (let index = bodyStart; index < openAiSource.length; index++) {
        const char = openAiSource[index];
        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                return openAiSource.slice(start, index + 1);
            }
        }
    }

    throw new Error(`Unable to find function source for ${name}`);
}

describe('OpenAI proxy preset wiring', () => {
    test('saves reverse proxy presets with the current Chat Completion source', () => {
        expect(openAiSource).toContain('buildReverseProxyPresetForSave({');
        expect(openAiSource).toContain('source: oai_settings.chat_completion_source');
        expect(openAiSource).toContain('supportedSources: REVERSE_PROXY_SUPPORTED_SOURCES');
    });

    test('applies proxy credentials before switching Chat Completion source', () => {
        const setProxyPresetSource = getFunctionSource('setProxyPreset');
        const proxyUpdateIndex = setProxyPresetSource.indexOf('oai_settings.reverse_proxy = normalizedPreset.url;');
        const passwordUpdateIndex = setProxyPresetSource.indexOf('oai_settings.proxy_password = normalizedPreset.password;');
        const sourceChangeIndex = setProxyPresetSource.indexOf("$('#chat_completion_source').val(normalizedPreset.source).trigger('change');");

        expect(proxyUpdateIndex).toBeGreaterThanOrEqual(0);
        expect(passwordUpdateIndex).toBeGreaterThan(proxyUpdateIndex);
        expect(sourceChangeIndex).toBeGreaterThan(passwordUpdateIndex);
        expect(setProxyPresetSource).toContain('reconnectOpenAi();');
    });
});
