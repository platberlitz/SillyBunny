import express from 'express';

import {
    FRONTEND_DIST_ROOT,
    applyFrontendAssetHeaders,
    getFrontendAssetsEnabled,
    loadFrontendManifest,
} from '../frontend-assets.js';

function setPublicAssetHeaders(res, requestPath) {
    if (/\.(?:html?|json|map)$/i.test(requestPath)) {
        res.setHeader('Cache-Control', 'no-cache');
        return;
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
}

export function getFrontendAssetMiddleware() {
    return {
        immutableAssets: express.static(FRONTEND_DIST_ROOT, {
            fallthrough: true,
            setHeaders: applyFrontendAssetHeaders,
        }),
        publicAssets: express.static(FRONTEND_DIST_ROOT, {
            fallthrough: true,
            setHeaders: setPublicAssetHeaders,
        }),
    };
}

export function shouldServeFrontendAssets() {
    return getFrontendAssetsEnabled() && Boolean(loadFrontendManifest());
}
