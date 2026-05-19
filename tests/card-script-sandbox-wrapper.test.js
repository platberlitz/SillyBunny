import { describe, expect, test } from '@jest/globals';
import { MESSAGE_TYPE, MESSAGE_VERSION } from '../public/scripts/card-script-sandbox/messages.js';
import { buildSandboxDocument, CARD_SCRIPT_SANDBOX_CSP } from '../public/scripts/card-script-sandbox/wrapper.js';

describe('card script sandbox wrapper', () => {
    test('builds a complete iframe srcdoc with the locked-down CSP', () => {
        const srcdoc = buildSandboxDocument({ html: '<p>Hello</p>', messageId: 12, nonce: 'nonce-12' });

        expect(srcdoc.startsWith('<!doctype html>')).toBe(true);
        expect(srcdoc).toContain('<html>');
        expect(srcdoc).toContain('<meta charset="utf-8">');
        expect(srcdoc).toContain(`<meta http-equiv="Content-Security-Policy" content="${CARD_SCRIPT_SANDBOX_CSP}">`);
        expect(CARD_SCRIPT_SANDBOX_CSP).toContain('img-src data: blob:');
        expect(CARD_SCRIPT_SANDBOX_CSP).toContain('media-src data: blob:');
        expect(CARD_SCRIPT_SANDBOX_CSP).toContain('font-src data:');
        expect(CARD_SCRIPT_SANDBOX_CSP).not.toContain('https:');
        expect(CARD_SCRIPT_SANDBOX_CSP).not.toContain('http:');
        expect(CARD_SCRIPT_SANDBOX_CSP).not.toContain('frame-ancestors');
        expect(CARD_SCRIPT_SANDBOX_CSP).not.toContain('files.catbox.moe');
        expect(srcdoc).toContain('<p>Hello</p>');
    });

    test('installs only a sandbox-local triggerSlash postMessage bridge', () => {
        const srcdoc = buildSandboxDocument({
            html: '<script>triggerSlash("/echo hello")</script>',
            messageId: 42,
            nonce: 'nonce-42',
        });

        expect(srcdoc).toContain('window["triggerSlash"] = function triggerSlash(input)');
        expect(srcdoc).toContain('window.parent.postMessage({');
        expect(srcdoc).toContain(`"type":"${MESSAGE_TYPE}"`);
        expect(srcdoc).toContain(`"version":${MESSAGE_VERSION}`);
        expect(srcdoc).toContain('"messageId":42');
        expect(srcdoc).toContain('"nonce":"nonce-42"');
        expect(srcdoc).toContain('command: String(input ?? \'\')');
    });

    test('does not expose parent-page state helpers or same-origin sandbox assumptions', () => {
        const srcdoc = buildSandboxDocument({ html: '<p>Safe</p>', messageId: 1, nonce: 'nonce-1' });

        expect(srcdoc).not.toContain('SillyTavern');
        expect(srcdoc).not.toContain('getContext');
        expect(srcdoc).not.toContain('localStorage');
        expect(srcdoc).not.toContain('sessionStorage');
        expect(srcdoc).not.toContain('document.cookie');
        expect(srcdoc).not.toContain('allow-same-origin');
    });

    test('keeps script-breaking metadata out of executable script literals', () => {
        const rawNonce = 'nonce</script><script>window.evil = true</script>';
        const srcdoc = buildSandboxDocument({ html: '', messageId: 7, nonce: rawNonce });

        expect(srcdoc).not.toContain(rawNonce);
        expect(srcdoc).toContain('nonce\\u003c/script\\u003e\\u003cscript\\u003ewindow.evil = true\\u003c/script\\u003e');
        expect(srcdoc.match(/<script>/g)).toHaveLength(1);
        expect(srcdoc.match(/<\/script>/g)).toHaveLength(1);
    });

    test('preserves card scripts for the future iframe runtime without adding parent wiring', () => {
        const sample = '<script>triggerSlash("/audioselect voice=bell | /audiomode narrator | /audioplay")</script>';
        const srcdoc = buildSandboxDocument({ html: sample, messageId: 99, nonce: 'nonce-99' });

        expect(srcdoc).toContain(sample);
        expect(srcdoc).toContain('/audioselect voice=bell | /audiomode narrator | /audioplay');
        expect(srcdoc.indexOf('window["triggerSlash"] = function triggerSlash(input)')).toBeLessThan(srcdoc.indexOf(sample));
        expect(srcdoc.match(/<script>/g)).toHaveLength(2);
        expect(srcdoc.match(/<\/script>/g)).toHaveLength(2);
    });
});
