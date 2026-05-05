import { describe, expect, test } from '@jest/globals';

import {
    FRONTEND_ASSET_PREFIX,
    HASHED_FRONTEND_ASSET_RE,
    rewriteFrontendHtml,
} from '../src/frontend-assets.js';

describe('frontend asset manifest rewriting', () => {
    test('leaves HTML unchanged when the frontend build is disabled', () => {
        const html = '<link href="style.css"><script type="module" src="script.js"></script>';
        expect(rewriteFrontendHtml(html, { enabled: false })).toBe(html);
    });

    test('keeps the immutable asset prefix stable for production serving', () => {
        expect(FRONTEND_ASSET_PREFIX).toBe('/frontend-assets/');
    });

    test('only treats fingerprinted frontend asset names as immutable', () => {
        expect(HASHED_FRONTEND_ASSET_RE.test('script-0123456789ab.js')).toBe(true);
        expect(HASHED_FRONTEND_ASSET_RE.test('scripts/extensions-abcdef123456.js')).toBe(true);
        expect(HASHED_FRONTEND_ASSET_RE.test('script.js')).toBe(false);
        expect(HASHED_FRONTEND_ASSET_RE.test('scripts/extensions.js')).toBe(false);
    });
});
