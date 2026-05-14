import { describe, expect, test } from '@jest/globals';
import { buildChatCompletionPreset, getChatCompletionConnectionPresetKeys } from '../public/scripts/openai-preset-utils.js';

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
});
