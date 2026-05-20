/* global document, getComputedStyle */
import { expect, test } from '@playwright/test';

test.describe('message formatting inline styles', () => {
    test('preserves safe inline CSS effects and strips dangerous CSS from rendered message spans', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 0 });

        const result = await page.evaluate(async () => {
            const mod = await import('/script.js');
            const html = mod.messageFormatting(
                '<span id="safe" style="display:inline-block;transform:rotate(2deg);opacity:0.7;text-shadow:2px 2px red;background:url(javascript:alert(1));">styled</span>',
                'Bob',
                false,
                false,
                123,
                {},
                false,
            );

            const host = document.createElement('div');
            host.style.position = 'fixed';
            host.style.left = '0';
            host.style.top = '0';
            host.innerHTML = html;
            document.body.appendChild(host);
            const safe = host.querySelector('#safe');
            const style = safe?.getAttribute('style') ?? '';
            const computed = safe ? getComputedStyle(safe) : null;

            return {
                html,
                style,
                display: computed?.display ?? null,
                transform: computed?.transform ?? null,
                opacity: computed?.opacity ?? null,
                textShadow: computed?.textShadow ?? null,
                backgroundImage: computed?.backgroundImage ?? null,
            };
        });

        expect(result.html).toContain('style="');
        expect(result.style).toContain('display:inline-block');
        expect(result.style).toContain('transform:rotate(2deg)');
        expect(result.style).toContain('opacity:0.7');
        expect(result.style).toContain('text-shadow:2px 2px red');
        expect(result.display).toBe('inline-block');
        expect(result.transform).not.toBe('none');
        expect(result.opacity).toBe('0.7');
        expect(result.textShadow).not.toBe('none');
        expect(result.backgroundImage).toBe('none');
    });
});
