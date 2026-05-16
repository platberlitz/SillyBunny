import { describe, test, expect, beforeEach } from '@jest/globals';
import {
    CARD_SCRIPT_MARKER_TAG,
    MAX_STASHED_CARD_SCRIPTS,
    buildCardScriptToastKey,
    containsEmbeddedCardScript,
    forgetAllCardScripts,
    getCardScriptSnapshot,
    getShownCardScriptToastCount,
    getStoredCardScriptCount,
    hasCardScriptToastBeenShown,
    hashCardScriptHtml,
    markCardScriptHtml,
    markCardScriptToastShown,
    rememberCardScript,
} from '../public/scripts/card-script-detection.js';

beforeEach(() => {
    forgetAllCardScripts();
});

describe('card script detection', () => {
    test('detects script tags and appends a marker', () => {
        const html = '<p>Hello</p><script>alert(1)</script>';
        const markedHtml = markCardScriptHtml(html, 7);

        expect(containsEmbeddedCardScript(html)).toBe(true);
        expect(markedHtml).toContain(`<${CARD_SCRIPT_MARKER_TAG} data-msg-id="7"></${CARD_SCRIPT_MARKER_TAG}>`);
        expect(getCardScriptSnapshot(7)).toMatchObject({
            html,
            hash: hashCardScriptHtml(html),
        });
    });

    test('detects iframe tags and appends a marker', () => {
        const html = '<iframe src="https://example.com"></iframe>';
        const markedHtml = markCardScriptHtml(html, 8);

        expect(containsEmbeddedCardScript(html)).toBe(true);
        expect(markedHtml).toContain(`<${CARD_SCRIPT_MARKER_TAG} data-msg-id="8"></${CARD_SCRIPT_MARKER_TAG}>`);
        expect(getCardScriptSnapshot(8)).toMatchObject({ html });
    });

    test('detects uppercase tags and whitespace before attributes', () => {
        expect(containsEmbeddedCardScript('<SCRIPT type="text/javascript"></SCRIPT>')).toBe(true);
        expect(containsEmbeddedCardScript('<  iframe src="https://example.com"></iframe>')).toBe(true);
    });

    test('does not detect lookalike tag names', () => {
        expect(containsEmbeddedCardScript('<scripts>alert(1)</scripts>')).toBe(false);
    });

    test('does not stash or mark plain text', () => {
        const html = '<p>No runnable card script here.</p>';

        expect(markCardScriptHtml(html, 9)).toBe(html);
        expect(getCardScriptSnapshot(9)).toBeNull();
        expect(getStoredCardScriptCount()).toBe(0);
    });

    test('does not stash or mark nullish or empty message ids as message zero', () => {
        const html = '<script>alert(1)</script>';

        expect(markCardScriptHtml(html, null)).toBe(html);
        expect(markCardScriptHtml(html, undefined)).toBe(html);
        expect(markCardScriptHtml(html, '')).toBe(html);

        expect(getCardScriptSnapshot(0)).toBeNull();
        expect(getStoredCardScriptCount()).toBe(0);
    });

    test('documents the accepted false positive for script text in code blocks', () => {
        const markdown = '```html\n<script>alert(1)</script>\n```';
        const markedHtml = markCardScriptHtml('<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>', 10, markdown);

        expect(containsEmbeddedCardScript(markdown)).toBe(true);
        expect(markedHtml).toContain(`<${CARD_SCRIPT_MARKER_TAG} data-msg-id="10"></${CARD_SCRIPT_MARKER_TAG}>`);
        expect(getCardScriptSnapshot(10)).toMatchObject({ html: markdown });
    });

    test('dedupes the same message id and content', () => {
        const html = '<script>console.log("same")</script>';
        const firstSnapshot = rememberCardScript(11, html);
        const secondSnapshot = rememberCardScript(11, html);

        expect(secondSnapshot).toBe(firstSnapshot);
        expect(getStoredCardScriptCount()).toBe(1);
    });

    test('evicts the oldest snapshots beyond the LRU limit', () => {
        for (let index = 0; index <= MAX_STASHED_CARD_SCRIPTS; index++) {
            markCardScriptHtml(`<script>${index}</script>`, index);
        }

        expect(getStoredCardScriptCount()).toBe(MAX_STASHED_CARD_SCRIPTS);
        expect(getCardScriptSnapshot(0)).toBeNull();
        expect(getCardScriptSnapshot(1)).toMatchObject({ html: '<script>1</script>' });
    });

    test('refreshes a reused message id so recent snapshots are retained', () => {
        const html = '<script>still-recent</script>';
        markCardScriptHtml(html, 0);

        for (let index = 1; index < MAX_STASHED_CARD_SCRIPTS; index++) {
            markCardScriptHtml(`<script>${index}</script>`, index);
        }

        rememberCardScript(0, html);
        markCardScriptHtml('<script>new-oldest</script>', MAX_STASHED_CARD_SCRIPTS);

        expect(getStoredCardScriptCount()).toBe(MAX_STASHED_CARD_SCRIPTS);
        expect(getCardScriptSnapshot(0)).toMatchObject({ html });
        expect(getCardScriptSnapshot(1)).toBeNull();
    });

    test('clears stored snapshots and toast keys', () => {
        const html = '<script>alert(1)</script>';
        const snapshot = rememberCardScript(12, html);
        const toastKey = buildCardScriptToastKey('chat-a', 12, snapshot.hash);
        markCardScriptToastShown(toastKey);

        forgetAllCardScripts();

        expect(getStoredCardScriptCount()).toBe(0);
        expect(getShownCardScriptToastCount()).toBe(0);
        expect(getCardScriptSnapshot(12)).toBeNull();
        expect(hasCardScriptToastBeenShown(toastKey)).toBe(false);
    });

    test('includes chat id, message id, and hash in toast keys so cross-chat messages re-toast', () => {
        const hash = hashCardScriptHtml('<script>alert(1)</script>');
        const firstChatKey = buildCardScriptToastKey('chat-a', 13, hash);
        const secondChatKey = buildCardScriptToastKey('chat-b', 13, hash);

        markCardScriptToastShown(firstChatKey);

        expect(firstChatKey).toBe(`chat-a:13:${hash}`);
        expect(secondChatKey).toBe(`chat-b:13:${hash}`);
        expect(hasCardScriptToastBeenShown(firstChatKey)).toBe(true);
        expect(hasCardScriptToastBeenShown(secondChatKey)).toBe(false);
    });
});
