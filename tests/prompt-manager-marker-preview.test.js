import { describe, expect, test } from '@jest/globals';
import { getRenderedMarkerPrompt } from '../public/scripts/prompt-manager-marker-preview.js';

function makeMessage(role, content) {
    return { role, content };
}

function makeCollection(identifier, collection) {
    return {
        identifier,
        getCollection: () => collection,
    };
}

function makeRoot(items) {
    return {
        getItemByIdentifier: identifier => items.find(item => item.identifier === identifier),
    };
}

describe('prompt manager marker preview', () => {
    test('reads rendered marker content from a message collection', () => {
        const messages = makeRoot([
            makeCollection('worldInfoBefore', [
                makeMessage('system', 'First world info entry.'),
                makeMessage('system', 'Second world info entry.'),
            ]),
        ]);

        expect(getRenderedMarkerPrompt('worldInfoBefore', messages)).toEqual({
            role: 'system',
            content: 'First world info entry.\n\nSecond world info entry.',
        });
    });

    test('flattens nested rendered marker collections', () => {
        const messages = makeRoot([
            makeCollection('worldInfoAfter', [
                makeCollection('nested', [makeMessage('user', 'Nested world info.')]),
            ]),
        ]);

        expect(getRenderedMarkerPrompt('worldInfoAfter', messages)).toEqual({
            role: 'user',
            content: 'Nested world info.',
        });
    });

    test('returns an empty system prompt when marker was not rendered', () => {
        expect(getRenderedMarkerPrompt('worldInfoBefore', makeRoot([]))).toEqual({
            role: 'system',
            content: '',
        });
    });
});
