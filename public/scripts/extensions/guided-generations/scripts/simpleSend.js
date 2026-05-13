import { debugLog, getContext, setPreviousImpersonateInput } from './shared.js';

let isSending = false;

async function simpleSend() {
    if (isSending) {
        debugLog('[SimpleSend] Send already in progress.');
        return;
    }

    isSending = true;
    try {
        const textarea = document.getElementById('send_textarea');
        if (!(textarea instanceof HTMLTextAreaElement)) {
            console.error('[GuidedGenerations][SimpleSend] Textarea #send_textarea not found.');
            return;
        }

        setPreviousImpersonateInput(textarea.value);
        await getContext().executeSlashCommandsWithOptions('/send {{input}} | /setinput');
    } catch (error) {
        console.error('[GuidedGenerations][SimpleSend] Error:', error);
    } finally {
        isSending = false;
    }
}

export { simpleSend };
