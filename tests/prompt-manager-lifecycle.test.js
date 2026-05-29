import { describe, expect, test } from '@jest/globals';

import {
    createPromptManagerLifecycle,
    PROMPT_MANAGER_RENDER_MODE,
    PROMPT_MANAGER_RENDER_SKIP_REASON,
    resolvePromptManagerRenderState,
    resolvePromptManagerScrollRestore,
} from '../public/scripts/prompt-manager-lifecycle/index.js';

describe('prompt manager lifecycle helper', () => {
    test('skips render when active API is not OpenAI', () => {
        expect(resolvePromptManagerRenderState({
            mainApi: 'textgenerationwebui',
            hasActiveCharacter: true,
        })).toEqual({
            shouldRender: false,
            shouldWaitForGeneration: false,
            shouldRunDryGenerate: false,
            mode: null,
            skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON.NON_OPENAI_API,
        });
    });

    test('skips character-ordered render without active character', () => {
        expect(resolvePromptManagerRenderState({
            mainApi: 'openai',
            promptOrderStrategy: 'character',
            hasActiveCharacter: false,
        })).toMatchObject({
            shouldRender: false,
            skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON.MISSING_CHARACTER,
        });
    });

    test('waits when normal or group generation is active', () => {
        expect(resolvePromptManagerRenderState({
            mainApi: 'openai',
            hasActiveCharacter: true,
            isSendPressed: true,
        })).toMatchObject({
            shouldRender: false,
            shouldWaitForGeneration: true,
            skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON.GENERATION_ACTIVE,
        });

        expect(resolvePromptManagerRenderState({
            mainApi: 'openai',
            hasActiveCharacter: true,
            isGroupGenerating: true,
        })).toMatchObject({
            shouldRender: false,
            shouldWaitForGeneration: true,
            skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON.GENERATION_ACTIVE,
        });
    });

    test('renders in dry-run mode when render follows prompt assembly', () => {
        expect(resolvePromptManagerRenderState({
            mainApi: ' OpenAI ',
            promptOrderStrategy: 'global',
            hasActiveCharacter: false,
            afterTryGenerate: true,
        })).toEqual({
            shouldRender: true,
            shouldWaitForGeneration: false,
            shouldRunDryGenerate: true,
            mode: PROMPT_MANAGER_RENDER_MODE.DRY_RUN,
            skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON.NONE,
        });
    });

    test('renders in live mode without dry generation', () => {
        expect(resolvePromptManagerRenderState({
            mainApi: 'openai',
            promptOrderStrategy: 'character',
            hasActiveCharacter: true,
            afterTryGenerate: false,
        })).toMatchObject({
            shouldRender: true,
            shouldRunDryGenerate: false,
            mode: PROMPT_MANAGER_RENDER_MODE.LIVE,
        });
    });

    test('resolves scroll restoration only for finite scroll positions', () => {
        expect(resolvePromptManagerScrollRestore({ scrollPosition: 42 })).toEqual({
            shouldRestore: true,
            scrollPosition: 42,
            shouldRestoreAfterAnimationFrame: true,
        });

        expect(resolvePromptManagerScrollRestore({ scrollPosition: null })).toEqual({
            shouldRestore: false,
            scrollPosition: null,
            shouldRestoreAfterAnimationFrame: false,
        });

        expect(resolvePromptManagerScrollRestore({ scrollPosition: Number.NaN })).toEqual({
            shouldRestore: false,
            scrollPosition: null,
            shouldRestoreAfterAnimationFrame: false,
        });
    });

    test('creates a stable lifecycle seam for future runtime wiring', () => {
        const lifecycle = createPromptManagerLifecycle();

        expect(lifecycle.render.mode).toBe(PROMPT_MANAGER_RENDER_MODE);
        expect(lifecycle.render.skipReason).toBe(PROMPT_MANAGER_RENDER_SKIP_REASON);
        expect(lifecycle.render.resolveState).toBe(resolvePromptManagerRenderState);
        expect(lifecycle.scroll.resolveRestore).toBe(resolvePromptManagerScrollRestore);
    });
});
