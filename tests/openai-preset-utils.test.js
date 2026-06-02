import { describe, expect, test } from '@jest/globals';
import {
    buildChatCompletionPreset,
    buildChatCompletionPresetForSave,
    buildReverseProxyPresetForSave,
    getChatCompletionConnectionPresetKeys,
    normalizeReverseProxyPreset,
    shouldIncludeConnectionFieldsInPreset,
} from '../public/scripts/openai-preset-utils.js';

const settingsMap = {
    chat_completion_source: ['#chat_completion_source', 'chat_completion_source', false, true],
    temperature: ['#temp_openai', 'temp_openai', false, false],
    openai_model: ['#model_openai_select', 'openai_model', false, true],
    assistant_prefill: ['#claude_assistant_prefill', 'assistant_prefill', false, false],
    custom_url: ['#custom_api_url_text', 'custom_url', false, true],
    prompts: ['', 'prompts', false, false],
};

const settings = {
    chat_completion_source: 'custom',
    temp_openai: 0.72,
    openai_model: 'mimo-model',
    assistant_prefill: '',
    custom_url: 'http://127.0.0.1:8080/v1',
    prompts: [{ identifier: 'main', content: 'Prompt after edit' }],
};

describe('Chat Completion preset utilities', () => {
    test('preserves legacy preset behavior by including connection fields by default', () => {
        expect(buildChatCompletionPreset(settings, settingsMap)).toEqual({
            chat_completion_source: 'custom',
            temperature: 0.72,
            openai_model: 'mimo-model',
            assistant_prefill: '',
            custom_url: 'http://127.0.0.1:8080/v1',
            prompts: [{ identifier: 'main', content: 'Prompt after edit' }],
        });
    });

    test('can build a generation preset without provider/model connection fields', () => {
        expect(buildChatCompletionPreset(settings, settingsMap, { includeConnection: false })).toEqual({
            temperature: 0.72,
            assistant_prefill: '',
            prompts: [{ identifier: 'main', content: 'Prompt after edit' }],
        });
    });

    test('keeps explicit empty generation values when excluding connection fields', () => {
        const preset = buildChatCompletionPreset(settings, settingsMap, { includeConnection: false });

        expect(Object.hasOwn(preset, 'assistant_prefill')).toBe(true);
        expect(preset.assistant_prefill).toBe('');
    });

    test('lists connection preset keys using preset field names', () => {
        expect(getChatCompletionConnectionPresetKeys(settingsMap)).toEqual([
            'chat_completion_source',
            'openai_model',
            'custom_url',
        ]);
    });

    test('excludes connection fields for normal preset saves', () => {
        const includeConnection = shouldIncludeConnectionFieldsInPreset({
            ...settings,
            bind_preset_to_connection: false,
        });

        expect(buildChatCompletionPreset(settings, settingsMap, { includeConnection })).toEqual({
            temperature: 0.72,
            assistant_prefill: '',
            prompts: [{ identifier: 'main', content: 'Prompt after edit' }],
        });
    });

    test('includes connection fields for explicitly linked preset saves', () => {
        const includeConnection = shouldIncludeConnectionFieldsInPreset({
            ...settings,
            bind_preset_to_connection: true,
        });

        expect(buildChatCompletionPreset(settings, settingsMap, { includeConnection })).toEqual({
            chat_completion_source: 'custom',
            temperature: 0.72,
            openai_model: 'mimo-model',
            assistant_prefill: '',
            custom_url: 'http://127.0.0.1:8080/v1',
            prompts: [{ identifier: 'main', content: 'Prompt after edit' }],
        });
    });

    test('builds preset manager save snapshots from the current link mode', () => {
        expect(buildChatCompletionPresetForSave({
            ...settings,
            bind_preset_to_connection: false,
        }, settingsMap)).toEqual({
            temperature: 0.72,
            assistant_prefill: '',
            prompts: [{ identifier: 'main', content: 'Prompt after edit' }],
        });

        expect(buildChatCompletionPresetForSave({
            ...settings,
            bind_preset_to_connection: true,
        }, settingsMap)).toEqual({
            chat_completion_source: 'custom',
            temperature: 0.72,
            openai_model: 'mimo-model',
            assistant_prefill: '',
            custom_url: 'http://127.0.0.1:8080/v1',
            prompts: [{ identifier: 'main', content: 'Prompt after edit' }],
        });
    });

    test('normalizes legacy reverse proxy presets without source bindings', () => {
        expect(normalizeReverseProxyPreset({
            name: 'Legacy proxy',
            url: 'https://proxy.example/v1',
            password: 'secret',
        }, { supportedSources: ['makersuite'] })).toEqual({
            name: 'Legacy proxy',
            url: 'https://proxy.example/v1',
            password: 'secret',
            source: '',
        });
    });

    test('saves supported reverse proxy source bindings', () => {
        expect(buildReverseProxyPresetForSave({
            name: 'Gemini proxy',
            url: 'https://proxy.example/google',
            password: 'secret',
            source: 'makersuite',
        }, { supportedSources: ['openai', 'makersuite'] })).toEqual({
            name: 'Gemini proxy',
            url: 'https://proxy.example/google',
            password: 'secret',
            source: 'makersuite',
        });
    });

    test('ignores unsupported reverse proxy source bindings', () => {
        expect(buildReverseProxyPresetForSave({
            name: 'Unsupported proxy',
            url: 'https://proxy.example/v1',
            password: '',
            source: 'custom',
        }, { supportedSources: ['openai', 'makersuite'] })).toEqual({
            name: 'Unsupported proxy',
            url: 'https://proxy.example/v1',
            password: '',
            source: '',
        });
    });

    test('does not source-bind the None reverse proxy preset', () => {
        expect(buildReverseProxyPresetForSave({
            name: 'None',
            url: '',
            password: '',
            source: 'makersuite',
        }, { supportedSources: ['makersuite'] })).toEqual({
            name: 'None',
            url: '',
            password: '',
            source: '',
        });
    });
});
