import { describe, expect, test } from '@jest/globals';

import {
    getQuickReplySetLinkNameKey,
    getQuickReplySetNameKey,
    getUniqueQuickReplySetLinksBySetName,
    getUniqueQuickReplySetsByName,
    removeQuickReplySetLinksByName,
} from '../public/scripts/extensions/quick-reply/src/quick-reply-set-list.js';

describe('Quick Reply set list helpers', () => {
    test('normalizes set names for duplicate detection', () => {
        expect(getQuickReplySetNameKey({ name: ' Default ' })).toBe('default');
        expect(getQuickReplySetNameKey({ name: 'Memory Sharding' })).toBe('memory sharding');
        expect(getQuickReplySetNameKey(null)).toBe('');
    });

    test('keeps the first set for each display name', () => {
        const defaultSet = { name: 'Default', qrList: [{ id: 1 }] };
        const duplicateDefaultSet = { name: ' default ', qrList: [{ id: 2 }] };
        const memorySet = { name: 'Memory Sharding', qrList: [{ id: 3 }] };
        const duplicateMemorySet = { name: 'MEMORY SHARDING', qrList: [{ id: 4 }] };

        expect(getUniqueQuickReplySetsByName([
            defaultSet,
            duplicateDefaultSet,
            memorySet,
            duplicateMemorySet,
            { name: '' },
            {},
        ])).toEqual([defaultSet, memorySet]);
    });

    test('keeps the first link for each linked set display name', () => {
        const defaultLink = { set: { name: 'Default' }, isVisible: true };
        const duplicateDefaultLink = { set: { name: ' default ' }, isVisible: true };
        const memoryLink = { set: { name: 'Memory Sharding' }, isVisible: false };

        expect(getQuickReplySetLinkNameKey(defaultLink)).toBe('default');
        expect(getUniqueQuickReplySetLinksBySetName([
            defaultLink,
            duplicateDefaultLink,
            { set: null },
            memoryLink,
        ])).toEqual([defaultLink, memoryLink]);
    });

    test('removes links by normalized set display name', () => {
        const defaultLink = { set: { name: 'Default' }, isVisible: true };
        const duplicateDefaultLink = { set: { name: ' default ' }, isVisible: true };
        const memoryLink = { set: { name: 'Memory Sharding' }, isVisible: false };

        expect(removeQuickReplySetLinksByName([
            defaultLink,
            duplicateDefaultLink,
            memoryLink,
        ], 'DEFAULT')).toEqual([memoryLink]);
    });
});
