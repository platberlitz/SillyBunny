import { describe, expect, test } from '@jest/globals';

import {
    CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY,
    resolveChatRenderLifecycleRollout,
} from '../public/scripts/chat-render-lifecycle/rollout-guard.js';

function createStorage(value) {
    return {
        getItem: key => key === CHAT_RENDER_LIFECYCLE_ROLLOUT_KEY ? value : null,
    };
}

describe('chat render lifecycle rollout guard', () => {
    test('defaults lifecycle routing off', () => {
        expect(resolveChatRenderLifecycleRollout()).toEqual({
            enabled: false,
            source: 'default',
        });
    });

    test('accepts an explicit default-on option for controlled tests', () => {
        expect(resolveChatRenderLifecycleRollout({ defaultEnabled: true })).toEqual({
            enabled: true,
            source: 'default',
        });
    });

    test('storage override enables lifecycle routing', () => {
        expect(resolveChatRenderLifecycleRollout({ storage: createStorage('true') })).toEqual({
            enabled: true,
            source: 'storage',
        });
    });

    test('storage override disables lifecycle routing', () => {
        expect(resolveChatRenderLifecycleRollout({
            defaultEnabled: true,
            storage: createStorage('false'),
        })).toEqual({
            enabled: false,
            source: 'storage',
        });
    });

    test('query override wins over storage', () => {
        expect(resolveChatRenderLifecycleRollout({
            queryValue: 'true',
            storage: createStorage('false'),
        })).toEqual({
            enabled: true,
            source: 'query',
        });
    });

    test('ignores invalid override values', () => {
        expect(resolveChatRenderLifecycleRollout({
            defaultEnabled: true,
            queryValue: 'maybe',
            storage: createStorage('wat'),
        })).toEqual({
            enabled: true,
            source: 'default',
        });
    });
});
