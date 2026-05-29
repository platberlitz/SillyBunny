import { describe, expect, test } from '@jest/globals';

import {
    createGenerationLifecycle,
    GENERATION_LIFECYCLE_ABORT_REASON,
    GENERATION_LIFECYCLE_UI_STATE,
    resolveGenerationUiLockState,
    resolveGenerationUnblockState,
    resolveStopGenerationState,
} from '../public/scripts/generation-lifecycle/index.js';

describe('generation lifecycle helper', () => {
    test('resolves idle UI lock state without DOM mutation', () => {
        expect(resolveGenerationUiLockState({ isGenerating: false })).toEqual({
            state: GENERATION_LIFECYCLE_UI_STATE.IDLE,
            shouldShowStopButton: false,
            shouldHideSwipeButtons: false,
            bodyGeneratingValue: null,
        });
    });

    test('resolves generating UI lock state without DOM mutation', () => {
        expect(resolveGenerationUiLockState({ isGenerating: true })).toEqual({
            state: GENERATION_LIFECYCLE_UI_STATE.GENERATING,
            shouldShowStopButton: true,
            shouldHideSwipeButtons: true,
            bodyGeneratingValue: 'true',
        });
    });

    test('keeps quiet generation blocked while its stream is still active', () => {
        expect(resolveGenerationUnblockState({
            type: 'quiet',
            hasStreamingProcessor: true,
            isStreamingFinished: false,
        })).toEqual({
            shouldUnblock: false,
            shouldActivateSendButtons: false,
            shouldResetProgress: false,
            shouldFlushEphemeralState: false,
        });
    });

    test('allows normal and finished quiet generation unblock cleanup', () => {
        expect(resolveGenerationUnblockState({
            type: 'normal',
            hasStreamingProcessor: true,
            isStreamingFinished: false,
        })).toEqual({
            shouldUnblock: true,
            shouldActivateSendButtons: true,
            shouldResetProgress: true,
            shouldFlushEphemeralState: true,
        });

        expect(resolveGenerationUnblockState({
            type: 'quiet',
            hasStreamingProcessor: true,
            isStreamingFinished: true,
        })).toMatchObject({
            shouldUnblock: true,
            shouldResetProgress: true,
        });
    });

    test('does not stop when no generation request is active', () => {
        expect(resolveStopGenerationState()).toEqual({
            shouldStop: false,
            shouldStopStreaming: false,
            shouldAbortRequest: false,
            shouldEmitStopped: false,
            shouldClearStreamingProcessor: false,
            unblockType: null,
            abortReason: GENERATION_LIFECYCLE_ABORT_REASON,
        });
    });

    test('stops streaming and preserves its generation type for unblock', () => {
        expect(resolveStopGenerationState({
            isSendPressed: false,
            isGroupGenerating: false,
            hasStreamingProcessor: true,
            streamingType: ' continue ',
        })).toEqual({
            shouldStop: true,
            shouldStopStreaming: true,
            shouldAbortRequest: true,
            shouldEmitStopped: true,
            shouldClearStreamingProcessor: true,
            unblockType: 'continue',
            abortReason: GENERATION_LIFECYCLE_ABORT_REASON,
        });
    });

    test('aborts non-streaming sends and group generations', () => {
        expect(resolveStopGenerationState({
            isSendPressed: true,
            isGroupGenerating: false,
            hasStreamingProcessor: false,
        })).toMatchObject({
            shouldStop: true,
            shouldStopStreaming: false,
            shouldAbortRequest: true,
            unblockType: null,
        });

        expect(resolveStopGenerationState({
            isSendPressed: false,
            isGroupGenerating: true,
            hasStreamingProcessor: false,
        })).toMatchObject({
            shouldStop: true,
            shouldAbortRequest: true,
        });
    });

    test('creates a stable lifecycle seam for future runtime wiring', () => {
        const lifecycle = createGenerationLifecycle();

        expect(lifecycle.ui.state).toBe(GENERATION_LIFECYCLE_UI_STATE);
        expect(lifecycle.ui.resolveLockState).toBe(resolveGenerationUiLockState);
        expect(lifecycle.ui.resolveUnblockState).toBe(resolveGenerationUnblockState);
        expect(lifecycle.stop.abortReason).toBe(GENERATION_LIFECYCLE_ABORT_REASON);
        expect(lifecycle.stop.resolveState).toBe(resolveStopGenerationState);
    });
});
