import { describe, test, expect, jest } from '@jest/globals';

await jest.unstable_mockModule('../public/scripts/extensions.js', () => ({
    getContext: jest.fn(() => null),
}));

const {
    canDeleteBook,
    canReadBook,
    canWriteBook,
    isPathfinderToolEnabled,
    normalizeAutoSummaryInterval,
    setBookPermission,
    setPathfinderToolEnabled,
    setSettings,
} = await import('../public/scripts/extensions/in-chat-agents/pathfinder/tree-store.js');

describe('Pathfinder settings utilities', () => {
    test('allows auto summary intervals below 20 down to the simple lower bound', () => {
        expect(normalizeAutoSummaryInterval(2)).toBe(2);
        expect(normalizeAutoSummaryInterval(5)).toBe(5);
        expect(normalizeAutoSummaryInterval(19)).toBe(19);
        expect(normalizeAutoSummaryInterval(1)).toBe(2);
    });

    test('persists canonical Pathfinder tool states independently of agent tool arrays', () => {
        setSettings({ toolStates: {} });

        expect(isPathfinderToolEnabled('Pathfinder_Search')).toBe(true);
        setPathfinderToolEnabled('Pathfinder_Search', false);
        expect(isPathfinderToolEnabled('Pathfinder_Search')).toBe(false);
        setPathfinderToolEnabled('Pathfinder_Search', true);
        expect(isPathfinderToolEnabled('Pathfinder_Search')).toBe(true);
    });

    test('interprets per-book permissions with backward compatible deny values', () => {
        setSettings({ bookPermissions: {} });

        expect(canReadBook('Book')).toBe(true);
        expect(canWriteBook('Book')).toBe(true);
        expect(canDeleteBook('Book')).toBe(true);

        setBookPermission('Book', 'read', 'none');
        setBookPermission('Book', 'write', false);
        setBookPermission('Book', 'delete', 'disabled');

        expect(canReadBook('Book')).toBe(false);
        expect(canWriteBook('Book')).toBe(false);
        expect(canDeleteBook('Book')).toBe(false);
    });
});
