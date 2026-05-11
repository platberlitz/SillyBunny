import { debugLog, getPreviousImpersonateInput } from './shared.js';

function recoverInput() {
    debugLog('[InputRecovery] Button clicked.');
    const textarea = document.getElementById('send_textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) {
        console.error('[GuidedGenerations][InputRecovery] Textarea #send_textarea not found.');
        return;
    }

    textarea.value = getPreviousImpersonateInput();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

export { recoverInput };
