/* global document, window */
import { expect, test } from '@playwright/test';

const APP_URL = process.env.SILLYBUNNY_TEST_BASE_URL || '/';

async function dismissOnboardingIfPresent(page) {
    const onboardingDialog = page.locator('dialog[open]:has(.onboarding)').first();

    if (await onboardingDialog.isVisible().catch(() => false)) {
        await onboardingDialog.locator('.popup-input').fill('Screenshot Tester');
        await onboardingDialog.locator('.popup-button-ok').click();
        await onboardingDialog.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
    }
}

async function installScreenshotMessage(page, messageText) {
    await page.evaluate(async (text) => {
        const context = window.SillyTavern.getContext();
        const chatElement = document.querySelector('#chat');
        if (!chatElement) {
            throw new Error('Chat element not found');
        }

        context.chat.length = 0;
        chatElement.replaceChildren();

        const makeMessage = (name, isUser, mes) => ({
            name,
            is_user: isUser,
            is_system: false,
            send_date: new Date().toISOString(),
            mes,
            extra: {},
        });
        const messages = [
            makeMessage('Screenshot Tester', true, text),
            makeMessage('Screenshot Assistant', false, 'range companion message'),
        ];

        for (const message of messages) {
            context.chat.push(message);
            context.addOneMessage(message, { scroll: false });
        }

        const messageTextElement = document.querySelector('#chat .mes[mesid="0"] .mes_text');
        if (!messageTextElement) {
            throw new Error('Screenshot message text not found');
        }

        messageTextElement.style.color = 'oklch(70% 0.2 140)';
    }, messageText);
}

async function exportScreenshot(page, messageIndex, startId, endId) {
    await page.locator('#chat .mes').nth(messageIndex).locator('.mes_screenshot').dispatchEvent('click');
    await page.locator('#message_screenshot_start_id').fill(String(startId));
    await page.locator('#message_screenshot_end_id').fill(String(endId));

    const downloadPromise = page.waitForEvent('download', { timeout: 45000 });
    await page.locator('.message_screenshot_popup .popup-button-ok').click();
    return await downloadPromise;
}

test.describe('message screenshots', () => {
    test.setTimeout(120000);

    test('exports single-message and range screenshots with OKLCH message colors', async ({ page }) => {
        const screenshotErrors = [];
        page.on('console', message => {
            if (message.type() === 'error' && /screenshot|html2canvas|unsupported color/i.test(message.text())) {
                screenshotErrors.push(message.text());
            }
        });

        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction('document.getElementById("preloader") === null', { timeout: 0 });
        await dismissOnboardingIfPresent(page);
        await installScreenshotMessage(page, 'single screenshot oklch regression');

        const singleDownload = await exportScreenshot(page, 0, 0, 0);
        expect(singleDownload.suggestedFilename()).toContain('message-0.png');

        const rangeDownload = await exportScreenshot(page, 0, 0, 1);
        expect(rangeDownload.suggestedFilename()).toContain('messages-0-1.png');
        expect(screenshotErrors).toEqual([]);
    });
});
