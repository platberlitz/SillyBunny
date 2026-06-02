import { describe, expect, test } from '@jest/globals';

import { setPublicAssetHeaders } from '../src/middleware/frontend-assets.js';

function getCacheControlFor(requestPath) {
    const headers = new Map();
    setPublicAssetHeaders({
        setHeader: (name, value) => headers.set(name, value),
    }, requestPath);
    return headers.get('Cache-Control');
}

describe('frontend asset fallback headers', () => {
    test('keeps raw JavaScript modules revalidating in production asset mode', () => {
        expect(getCacheControlFor('/scripts/chat-render-lifecycle/render-window.js')).toBe('no-cache');
        expect(getCacheControlFor('/scripts/bootstrap.mjs')).toBe('no-cache');
    });

    test('keeps static non-code fallback assets short-lived', () => {
        expect(getCacheControlFor('/img/logo.png')).toBe('public, max-age=3600');
    });
});
