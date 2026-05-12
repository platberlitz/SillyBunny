import { describe, expect, test } from '@jest/globals';
import { __test } from '../src/endpoints/character-bot-sources.js';

describe('character bot sources helpers', () => {
    test('keeps only verified sources searchable', () => {
        expect(__test.SOURCES.chub.searchable).toBe(true);
        expect(__test.SOURCES.aicc.searchable).toBe(false);
        expect(__test.SOURCES.janitorai.searchable).toBe(false);
        expect(__test.SOURCES.janny.searchable).toBe(false);
        expect(__test.SOURCES.direct.searchable).toBe(false);
    });

    test('builds a synthetic import result for direct URLs', () => {
        const payload = __test.searchDirect('https://example.com/cards/alice.png');

        expect(payload.total).toBe(1);
        expect(payload.hasMore).toBe(false);
        expect(payload.results[0]).toMatchObject({
            source: 'direct',
            name: 'Import from example.com',
            importUrl: 'https://example.com/cards/alice.png',
            pageUrl: 'https://example.com/cards/alice.png',
        });
    });

    test('rejects non-URL direct searches', () => {
        expect(__test.searchDirect('alice').results).toEqual([]);
        expect(__test.searchDirect('ftp://example.com/card.png').results).toEqual([]);
    });

    test('maps Chub search responses to the shared result shape', () => {
        const payload = __test.mapChubSearchResponse({
            data: {
                count: 63,
                nodes: [
                    {
                        id: 123,
                        name: 'Alice',
                        fullPath: 'Anonymous/alice-89fca9a6',
                        tagline: 'A curious test card',
                        topics: ['sfw', 'adventure'],
                        avatar_url: 'https://avatars.example/alice.png',
                        starCount: 7,
                        nChats: 42,
                        nsfw_image: false,
                    },
                ],
            },
        }, 1);

        expect(payload.total).toBe(63);
        expect(payload.hasMore).toBe(true);
        expect(payload.results[0]).toMatchObject({
            id: '123',
            source: 'chub',
            name: 'Alice',
            author: 'Anonymous',
            description: 'A curious test card',
            thumbnailUrl: 'https://avatars.example/alice.png',
            pageUrl: 'https://chub.ai/characters/Anonymous/alice-89fca9a6',
            importUrl: 'https://chub.ai/characters/Anonymous/alice-89fca9a6',
            tags: ['sfw', 'adventure'],
            nsfw: false,
            downloads: 42,
            stars: 7,
        });
    });

    test('trusts Chub exact counts for pagination', () => {
        const payload = __test.mapChubSearchResponse({
            data: {
                count: 24,
                nodes: Array.from({ length: 24 }, (_value, index) => ({
                    id: index,
                    name: `Card ${index}`,
                    fullPath: `creator/card-${index}`,
                })),
            },
        }, 1);

        expect(payload.hasMore).toBe(false);
    });
});
