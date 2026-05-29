import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptSource = readFileSync(path.join(repoRoot, 'public', 'script.js'), 'utf8');

function getFunctionSource(name, { exported = false } = {}) {
    const marker = `${exported ? 'export ' : ''}function ${name}(`;
    const start = scriptSource.indexOf(marker);

    expect(start).toBeGreaterThanOrEqual(0);

    const bodyStart = scriptSource.indexOf(') {', start) + 2;
    let depth = 0;

    for (let index = bodyStart; index < scriptSource.length; index++) {
        const char = scriptSource[index];
        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                return scriptSource.slice(start, index + 1);
            }
        }
    }

    throw new Error(`Unable to find function source for ${name}`);
}

describe('generation lifecycle wiring', () => {
    test('imports generation lifecycle decisions into the script adapter', () => {
        expect(scriptSource).toContain('resolveGenerationUiLockState');
        expect(scriptSource).toContain('resolveGenerationUnblockState');
        expect(scriptSource).toContain('resolveStopGenerationState');
    });

    test('routes send-button activation through lifecycle lock state', () => {
        const activateSource = getFunctionSource('activateSendButtons', { exported: true });

        expect(activateSource).toContain('resolveGenerationUiLockState({ isGenerating: false })');
        expect(activateSource).toContain('lockState.shouldShowStopButton');
        expect(activateSource).toContain('lockState.shouldHideSwipeButtons');
        expect(activateSource).toContain('lockState.bodyGeneratingValue');
    });

    test('routes send-button deactivation through lifecycle lock state', () => {
        const deactivateSource = getFunctionSource('deactivateSendButtons', { exported: true });

        expect(deactivateSource).toContain('resolveGenerationUiLockState({ isGenerating: true })');
        expect(deactivateSource).toContain('lockState.shouldShowStopButton');
        expect(deactivateSource).toContain('lockState.shouldHideSwipeButtons');
        expect(deactivateSource).toContain('lockState.bodyGeneratingValue');
        expect(deactivateSource).not.toContain('document.body.dataset.generating = \'true\';');
    });

    test('routes stop-generation decisions through lifecycle stop state', () => {
        const stopSource = getFunctionSource('stopGeneration', { exported: true });

        expect(stopSource).toContain('resolveStopGenerationState({');
        expect(stopSource).toContain('isSendPressed: is_send_press');
        expect(stopSource).toContain('isGroupGenerating: is_group_generating');
        expect(stopSource).toContain('hasStreamingProcessor: Boolean(activeStreamingProcessor)');
        expect(stopSource).toContain('streamingType: activeStreamingProcessor?.type');
        expect(stopSource).toContain('activeStreamingProcessor.onStopStreaming();');
        expect(stopSource).toContain('abortController.abort(stopState.abortReason);');
        expect(stopSource).toContain('unblockGeneration(stopState.unblockType, { emitGenerationEnded: false });');
        expect(stopSource).not.toContain('Clicked stop button');
    });

    test('routes unblock cleanup decisions through lifecycle unblock state', () => {
        const unblockSource = getFunctionSource('unblockGeneration');

        expect(unblockSource).toContain('resolveGenerationUnblockState({');
        expect(unblockSource).toContain('type');
        expect(unblockSource).toContain('hasStreamingProcessor: Boolean(streamingProcessor)');
        expect(unblockSource).toContain('isStreamingFinished: Boolean(streamingProcessor?.isFinished)');
        expect(unblockSource).toContain('unblockState.shouldActivateSendButtons');
        expect(unblockSource).toContain('unblockState.shouldResetProgress');
        expect(unblockSource).toContain('unblockState.shouldFlushEphemeralState');
        expect(unblockSource).not.toContain('type === \'quiet\' && streamingProcessor && !streamingProcessor.isFinished');
    });

    test('routes provider-error cleanup through stopped lifecycle semantics', () => {
        expect(scriptSource).toContain('this.markUIGenStopped({ emitGenerationEnded: false, emitGenerationStopped: true });');
        expect(scriptSource).toContain('eventSource.emit(event_types.GENERATION_STOPPED);\n        unblockGeneration(type, { emitGenerationEnded: false });');
    });
});
