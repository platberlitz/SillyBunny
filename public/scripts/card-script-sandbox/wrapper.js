import { MESSAGE_TYPE, MESSAGE_VERSION } from './messages.js';

export const CARD_SCRIPT_SANDBOX_CSP = 'default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'';

const TRIGGER_SLASH_BRIDGE_NAME = 'triggerSlash';

// Sandboxed srcdoc frames have opaque origins, so postMessage needs '*'. The
// parent listener must authenticate by event.source plus message metadata.

export function buildSandboxDocument({ html = '', messageId = null, nonce = '' } = {}) {
    const cardHtml = html == null ? '' : String(html);
    const config = escapeScriptJson({
        type: MESSAGE_TYPE,
        version: MESSAGE_VERSION,
        messageId,
        nonce: nonce == null ? '' : String(nonce),
    });

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(CARD_SCRIPT_SANDBOX_CSP)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<script>
(function () {
    'use strict';

    const config = ${config};

    window[${JSON.stringify(TRIGGER_SLASH_BRIDGE_NAME)}] = function triggerSlash(input) {
        window.parent.postMessage({
            type: config.type,
            version: config.version,
            messageId: config.messageId,
            nonce: config.nonce,
            command: String(input ?? ''),
        }, '*');
    };
}());
</script>
${cardHtml}
</body>
</html>`;
}

function escapeScriptJson(value) {
    return JSON.stringify(value)
        .replace(/&/g, '\\u0026')
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
