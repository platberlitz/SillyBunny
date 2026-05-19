import { normalizeContentText } from '../../../script.js';
import { removeReasoningFromString } from '../../reasoning.js';

export function extractProfileResponseText(response) {
    const text = normalizeContentText(response?.content)
        || normalizeContentText(response?.choices?.[0]?.message?.content)
        || normalizeContentText(response?.candidates?.[0]?.content?.parts)
        || normalizeContentText(response?.candidates?.[0]?.output?.parts)
        || normalizeContentText(response?.text)
        || normalizeContentText(response?.output)
        || normalizeContentText(response?.message?.content)
        || normalizeContentText(response?.message?.tool_plan)
        || normalizeContentText(response?.message)
        || '';
    return removeReasoningFromString(text);
}

export function buildFallbackPromptText(promptMessages) {
    return promptMessages
        .map(message => `${String(message?.role ?? 'user').toUpperCase()}:\n${normalizeContentText(message?.content)}`)
        .join('\n\n');
}
