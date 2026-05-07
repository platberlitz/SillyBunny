import { describe, test, expect, jest } from '@jest/globals';

await jest.unstable_mockModule('../public/scripts/extensions.js', () => ({
    getContext: jest.fn(() => null),
}));

const { normalizeAutoSummaryInterval } = await import('../public/scripts/extensions/in-chat-agents/pathfinder/tree-store.js');

describe('Pathfinder settings utilities', () => {
    test('allows auto summary intervals below 20 down to the simple lower bound', () => {
        expect(normalizeAutoSummaryInterval(2)).toBe(2);
        expect(normalizeAutoSummaryInterval(5)).toBe(5);
        expect(normalizeAutoSummaryInterval(19)).toBe(19);
        expect(normalizeAutoSummaryInterval(1)).toBe(2);
    });
});
