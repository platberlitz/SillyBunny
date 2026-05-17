import { describe, expect, test } from '@jest/globals';

import { isLikelyLocalServerUrl } from '../public/scripts/local-url-utils.js';

describe('isLikelyLocalServerUrl', () => {
    const localServerUrls = [
        ['http://localhost:5000/v1'],
        ['http://127.0.0.1:5000/v1'],
        ['http://[::1]:5000/v1'],
        ['http://10.0.0.2:5000/v1'],
        ['http://192.168.1.20:5000/v1'],
        ['http://172.20.0.2:5000/v1'],
        ['http://sillybunny.local:5000/v1'],
    ];

    for (const [serverUrl] of localServerUrls) {
        test(`treats ${serverUrl} as local`, () => {
            expect(isLikelyLocalServerUrl(serverUrl)).toBe(true);
        });
    }

    test('resolves browser-relative URLs against the supplied local base URL', () => {
        expect(isLikelyLocalServerUrl('/v1', 'http://[::1]:5000')).toBe(true);
    });

    const remoteServerUrls = [
        ['https://api.openai.com/v1'],
        ['http://example.com/v1'],
        ['http://172.15.0.2:5000/v1'],
        ['http://[2001:db8::1]:5000/v1'],
    ];

    for (const [serverUrl] of remoteServerUrls) {
        test(`does not treat ${serverUrl} as local`, () => {
            expect(isLikelyLocalServerUrl(serverUrl)).toBe(false);
        });
    }
});
