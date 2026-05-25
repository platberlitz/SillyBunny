import { describe, expect, test } from '@jest/globals';

import { normalizeCharacterBookPosition } from '../public/scripts/world-info-character-book.js';

const positions = {
    before: 0,
    after: 1,
    ANTop: 2,
    ANBottom: 3,
    atDepth: 4,
    EMTop: 5,
    EMBottom: 6,
    outlet: 7,
};

describe('normalizeCharacterBookPosition', () => {
    test('normalizes CC/ST before_char extension positions', () => {
        expect(normalizeCharacterBookPosition('before_char', 'after_char', positions)).toBe(positions.before);
    });

    test('normalizes CC/ST after_char entry positions', () => {
        expect(normalizeCharacterBookPosition(undefined, 'after_char', positions)).toBe(positions.after);
    });

    test('preserves numeric World Info positions', () => {
        expect(normalizeCharacterBookPosition(positions.atDepth, 'before_char', positions)).toBe(positions.atDepth);
    });

    test('normalizes numeric string positions from imported metadata', () => {
        expect(normalizeCharacterBookPosition('0', 'after_char', positions)).toBe(positions.before);
    });

    test('falls back to after when no known position exists', () => {
        expect(normalizeCharacterBookPosition('unknown', undefined, positions)).toBe(positions.after);
    });
});
