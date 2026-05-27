import { normalizeContentText } from '../../../script.js';
import { removeReasoningFromString } from '../../reasoning.js';

const HIDDEN_RESPONSE_PART_TYPES = new Set([
    'reasoning',
    'reasoning_content',
    'reasoning_text',
    'thinking',
    'thought',
]);

function isHiddenResponsePart(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const type = String(value.type ?? '').trim().toLowerCase();
    if (value.thought === true || HIDDEN_RESPONSE_PART_TYPES.has(type) || /reasoning|thinking|thought/.test(type)) {
        return true;
    }

    const hasVisibleText = typeof value.text === 'string'
        || typeof value.content === 'string'
        || Array.isArray(value.content)
        || typeof value.output === 'string'
        || Array.isArray(value.output)
        || typeof value.message === 'string'
        || (value.message && typeof value.message === 'object' && typeof value.message.content !== 'undefined');

    return !hasVisibleText && (
        typeof value.reasoning === 'string'
        || typeof value.reasoning_content === 'string'
        || typeof value.thinking === 'string'
        || Array.isArray(value.reasoning)
        || Array.isArray(value.thinking)
    );
}

function normalizeVisibleContentText(value) {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (value == null) {
        return '';
    }

    if (Array.isArray(value)) {
        return value
            .map(item => normalizeVisibleContentText(item))
            .filter(Boolean)
            .join('\n\n');
    }

    if (typeof value === 'object') {
        if (isHiddenResponsePart(value)) {
            return '';
        }

        for (const candidate of [value.text, value.content, value.parts, value.output, value.message, value.tool_plan]) {
            const text = normalizeVisibleContentText(candidate);
            if (text) {
                return text;
            }
        }
    }

    return '';
}

function firstVisibleContentText(...values) {
    for (const value of values) {
        const text = normalizeVisibleContentText(value);
        if (text) {
            return text;
        }
    }

    return '';
}

export function extractProfileResponseText(response) {
    const text = firstVisibleContentText(
        response?.content,
        response?.choices?.[0]?.text,
        response?.choices?.[0]?.message?.content,
        response?.choices?.[0]?.content,
        response?.responseContent?.parts,
        response?.candidates?.[0]?.content?.parts,
        response?.candidates?.[0]?.output?.parts,
        response?.text,
        response?.output,
        response?.message?.content,
        response?.message?.tool_plan,
        response?.message,
    );
    return removeReasoningFromString(text);
}

export function buildFallbackPromptText(promptMessages) {
    return promptMessages
        .map(message => `${String(message?.role ?? 'user').toUpperCase()}:\n${normalizeContentText(message?.content)}`)
        .join('\n\n');
}
