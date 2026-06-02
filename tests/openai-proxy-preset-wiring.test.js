import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const openAiSource = readFileSync(path.join(repoRoot, 'public', 'scripts', 'openai.js'), 'utf8');
const indexHtml = readFileSync(path.join(repoRoot, 'public', 'index.html'), 'utf8');

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
    test('saves reverse proxy presets with the selected backend binding', () => {
        expect(openAiSource).toContain('buildReverseProxyPresetForSave({');
        expect(openAiSource).toContain('source: $(\'#openai_proxy_source\').val() || \'\'');
        expect(openAiSource).toContain('supportedSources: REVERSE_PROXY_SUPPORTED_SOURCES');
    });

    test('shows an explicit reverse proxy backend selector', () => {
        expect(indexHtml).toContain('id="openai_proxy_source"');
        expect(indexHtml).toContain('None (Don\'t switch)');
        expect(indexHtml).toContain('value="makersuite"');
    });

    test('renders clean source indicators in proxy preset options', () => {
        const optionTextSource = getFunctionSource('getReverseProxyPresetOptionText');

        expect(openAiSource).toContain('function getReverseProxySourceLabel(source)');
        expect(openAiSource).toContain('[chat_completion_sources.MAKERSUITE]: \'AI Studio\'');
        expect(optionTextSource).toContain('`${normalizedPreset.name} [${sourceLabel}]`');
    });

    test('applies proxy credentials before switching Chat Completion source', () => {
        const setProxyPresetSource = getFunctionSource('setProxyPreset');
        const proxyUpdateIndex = setProxyPresetSource.indexOf('oai_settings.reverse_proxy = normalizedPreset.url;');
        const passwordUpdateIndex = setProxyPresetSource.indexOf('oai_settings.proxy_password = normalizedPreset.password;');
        const sourceChangeIndex = setProxyPresetSource.indexOf('$(\'#chat_completion_source\').val(normalizedPreset.source).trigger(\'change\');');

        expect(proxyUpdateIndex).toBeGreaterThanOrEqual(0);
        expect(passwordUpdateIndex).toBeGreaterThan(proxyUpdateIndex);
        expect(sourceChangeIndex).toBeGreaterThan(passwordUpdateIndex);
        expect(setProxyPresetSource).toContain('reconnectOpenAi();');
    });

    test('applies selected proxy backend binding when loading presets', () => {
        const loadProxyPresetsSource = getFunctionSource('loadProxyPresets');
        const applySourceFlagIndex = loadProxyPresetsSource.indexOf('const shouldApplySource = Boolean(selected_proxy.source);');
        const setProxyPresetIndex = loadProxyPresetsSource.indexOf('setProxyPreset(selected_proxy.name, selected_proxy.url, selected_proxy.password, selected_proxy.source, { applySource: shouldApplySource });');

        expect(applySourceFlagIndex).toBeGreaterThanOrEqual(0);
        expect(setProxyPresetIndex).toBeGreaterThan(applySourceFlagIndex);
        expect(loadProxyPresetsSource).not.toContain('{ applySource: false }');
    });
});
