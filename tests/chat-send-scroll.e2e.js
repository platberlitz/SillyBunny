/* global document, requestAnimationFrame, window */
import { expect, test } from '@playwright/test';

const APP_URL = process.env.SILLYBUNNY_TEST_BASE_URL || '/';

async function dismissOnboardingIfPresent(page) {
    const onboardingInput = page.locator('dialog[open] textarea.popup-input').first();

    if (await onboardingInput.isVisible().catch(() => false)) {
        await onboardingInput.fill('Scroll Tester');
        await page.locator('dialog[open] .popup-button-ok').first().click();
        await page.locator('dialog[open]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
    }
}

async function selectSampleCharacter(page) {
    await page.locator('#sb-character-toggle').click();

    const sampleCharacter = page.locator('.character_select').filter({ hasText: /Bunny Guide|Seraphina/ }).first();
    await expect(sampleCharacter).toBeVisible();
    await sampleCharacter.click();

    const optionalLorebookDecline = page.locator('.popup-button-cancel:visible').first();
    if (await optionalLorebookDecline.isVisible().catch(() => false)) {
        await optionalLorebookDecline.click();
        await page.locator('dialog[open]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
    }

    await expect(page.locator('#send_textarea')).toBeVisible();
}

test.describe('chat send scroll', () => {
    test('scrolls to the latest user message immediately after send', async ({ page }) => {
        await page.goto(APP_URL);
        await page.waitForFunction('document.getElementById("preloader") === null', { timeout: 0 });
        await dismissOnboardingIfPresent(page);
        await selectSampleCharacter(page);

        await page.route('**/api/chats/save', async route => {
            await new Promise(resolve => setTimeout(resolve, 1200));
            await route.fulfill({ status: 200, json: {} });
        });

        await page.evaluate(async () => {
            const context = window.SillyTavern.getContext();
            const chatElement = document.querySelector('#chat');
            context.powerUserSettings.auto_scroll_chat_to_bottom = true;

            for (let index = 0; index < 12; index++) {
                const message = {
                    name: 'Scroll Tester',
                    is_user: true,
                    is_system: false,
                    send_date: new Date().toISOString(),
                    mes: `scroll filler ${index} ${'x '.repeat(60)}`,
                    extra: {},
                };

                context.chat.push(message);
                context.addOneMessage(message, { scroll: false });
            }

            chatElement.scrollTop = chatElement.scrollHeight;
            await new Promise(resolve => requestAnimationFrame(resolve));
        });

        const messageText = `scroll regression ${Date.now()}`;
        await page.locator('#send_textarea').fill(messageText);
        await page.locator('#send_textarea').press('Enter');

        const scrolledToSentMessage = await page.waitForFunction((expectedText) => {
            const chatElement = document.querySelector('#chat');
            const sentMessage = Array.from(chatElement.querySelectorAll('.mes[is_user="true"]'))
                .find(message => message.textContent.includes(expectedText));

            if (!sentMessage) {
                return false;
            }

            const chatRect = chatElement.getBoundingClientRect();
            const messageRect = sentMessage.getBoundingClientRect();
            const bottomDelta = chatElement.scrollHeight - chatElement.clientHeight - chatElement.scrollTop;

            return messageRect.bottom <= chatRect.bottom + 4 && bottomDelta <= 12;
        }, messageText, { timeout: 1000 });

        expect(await scrolledToSentMessage.jsonValue()).toBe(true);
    });
});
