export const PROMPT_MANAGER_RENDER_SKIP_REASON = Object.freeze({
    NONE: 'none',
    NON_OPENAI_API: 'non-openai-api',
    MISSING_CHARACTER: 'missing-character',
    GENERATION_ACTIVE: 'generation-active',
});

export const PROMPT_MANAGER_RENDER_MODE = Object.freeze({
    DRY_RUN: 'dry-run',
    LIVE: 'live',
});

function normalizeString(value) {
    return String(value ?? '').trim();
}

/**
 * Resolves whether Prompt Manager should render now, wait, or skip.
 * @param {object} options Options.
 * @param {string} [options.mainApi=''] Active main API.
 * @param {string} [options.promptOrderStrategy='global'] Prompt order strategy.
 * @param {boolean} [options.hasActiveCharacter=false] Whether a character context is active.
 * @param {boolean} [options.afterTryGenerate=true] Whether render should run a dry generation first.
 * @param {boolean} [options.isSendPressed=false] Whether normal generation is active.
 * @param {boolean} [options.isGroupGenerating=false] Whether group generation is active.
 * @returns {{shouldRender: boolean, shouldWaitForGeneration: boolean, shouldRunDryGenerate: boolean, mode: string|null, skipReason: string}}
 */
export function resolvePromptManagerRenderState({
    mainApi = '',
    promptOrderStrategy = 'global',
    hasActiveCharacter = false,
    afterTryGenerate = true,
    isSendPressed = false,
    isGroupGenerating = false,
} = {}) {
    if (normalizeString(mainApi).toLowerCase() !== 'openai') {
        return {
            shouldRender: false,
            shouldWaitForGeneration: false,
            shouldRunDryGenerate: false,
            mode: null,
            skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON.NON_OPENAI_API,
        };
    }

    if (promptOrderStrategy === 'character' && !hasActiveCharacter) {
        return {
            shouldRender: false,
            shouldWaitForGeneration: false,
            shouldRunDryGenerate: false,
            mode: null,
            skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON.MISSING_CHARACTER,
        };
    }

    if (isSendPressed || isGroupGenerating) {
        return {
            shouldRender: false,
            shouldWaitForGeneration: true,
            shouldRunDryGenerate: false,
            mode: null,
            skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON.GENERATION_ACTIVE,
        };
    }

    const shouldRunDryGenerate = Boolean(afterTryGenerate);

    return {
        shouldRender: true,
        shouldWaitForGeneration: false,
        shouldRunDryGenerate,
        mode: shouldRunDryGenerate
            ? PROMPT_MANAGER_RENDER_MODE.DRY_RUN
            : PROMPT_MANAGER_RENDER_MODE.LIVE,
        skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON.NONE,
    };
}

/**
 * Resolves Prompt Manager scroll restoration policy after a render.
 * @param {object} options Options.
 * @param {unknown} [options.scrollPosition=null] Captured scroll position.
 * @returns {{shouldRestore: boolean, scrollPosition: number|null, shouldRestoreAfterAnimationFrame: boolean}}
 */
export function resolvePromptManagerScrollRestore({
    scrollPosition = null,
} = {}) {
    if (scrollPosition === undefined || scrollPosition === null) {
        return {
            shouldRestore: false,
            scrollPosition: null,
            shouldRestoreAfterAnimationFrame: false,
        };
    }

    const numericScrollPosition = Number(scrollPosition);
    const shouldRestore = Number.isFinite(numericScrollPosition);

    return {
        shouldRestore,
        scrollPosition: shouldRestore ? numericScrollPosition : null,
        shouldRestoreAfterAnimationFrame: shouldRestore,
    };
}

/**
 * Creates the compatibility-facing prompt manager lifecycle seam.
 * Runtime call sites should depend on this shape instead of individual helpers.
 * @returns {object}
 */
export function createPromptManagerLifecycle() {
    return {
        render: {
            mode: PROMPT_MANAGER_RENDER_MODE,
            skipReason: PROMPT_MANAGER_RENDER_SKIP_REASON,
            resolveState: resolvePromptManagerRenderState,
        },
        scroll: {
            resolveRestore: resolvePromptManagerScrollRestore,
        },
    };
}
