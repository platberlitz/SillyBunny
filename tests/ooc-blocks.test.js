import { describe, test, expect } from '@jest/globals';

import {
    extractOocBlocksForDisplay,
    hasTextOrArrayPayload,
    renderOocBlock,
    restoreOocBlocksForDisplay,
    stripHtmlTagsFromContext,
    stripOocBlocksFromContext,
} from '../public/scripts/ooc-blocks.js';

describe('OOC block handling', () => {
    test('removes balanced OOC blocks from prompt context', () => {
        expect(stripOocBlocksFromContext('Visible ((do not prompt this)) text')).toBe('Visible text');
    });

    test('removes nested OOC blocks as one prompt-context unit', () => {
        expect(stripOocBlocksFromContext('Visible ((outer ((inner)) done)) text')).toBe('Visible text');
    });

    test('keeps unclosed OOC text intact instead of swallowing the rest of the prompt', () => {
        expect(stripOocBlocksFromContext('Visible ((unfinished note')).toBe('Visible ((unfinished note');
    });

    test('can preserve OOC blocks for recent context messages', () => {
        expect(stripOocBlocksFromContext('Visible ((keep this)) text', true)).toBe('Visible ((keep this)) text');
    });

    test('strips or preserves HTML tags for prompt context', () => {
        expect(stripHtmlTagsFromContext('Visible <strong>tagged</strong> text')).toBe('Visible tagged text');
        expect(stripHtmlTagsFromContext('Visible <strong>tagged</strong> text', true)).toBe('Visible <strong>tagged</strong> text');
    });

    test('extracts and restores OOC display blocks in source order', () => {
        const blocks = [];
        const extracted = extractOocBlocksForDisplay('A ((first)) B ((second)) C', blocks);
        const restored = restoreOocBlocksForDisplay(extracted, blocks);

        expect(blocks).toEqual(['first', 'second']);
        expect(restored).toContain('A <details class="ooc_block">');
        expect(restored).toContain('<div class="ooc_content">first</div>');
        expect(restored).toContain(' B <details class="ooc_block">');
        expect(restored).toContain('<div class="ooc_content">second</div>');
        expect(restored).toContain(' C');
    });

    test('escapes OOC display content before final sanitization', () => {
        const rendered = renderOocBlock('<img src=x onerror=alert(1)> & "quote"');

        expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(rendered).toContain('&amp;');
        expect(rendered).toContain('&quot;quote&quot;');
        expect(rendered).not.toContain('<img src=x');
    });

    test('renders empty OOC content with a stable placeholder label', () => {
        expect(renderOocBlock('   ')).toContain('<div class="ooc_content">(empty)</div>');
    });

    test('keeps media-only and tool-only prompt messages after OOC text stripping', () => {
        expect(hasTextOrArrayPayload('', [[{ url: 'image.png' }]])).toBe(true);
        expect(hasTextOrArrayPayload('', [[], [{ id: 'tool-call' }]])).toBe(true);
        expect(hasTextOrArrayPayload(stripOocBlocksFromContext('((note only))'), [])).toBe(false);
        expect(hasTextOrArrayPayload('', [[], undefined])).toBe(false);
    });
});
