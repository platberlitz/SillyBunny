import { describe, expect, test } from '@jest/globals';

import {
    captureVisibleMessageAnchor,
    restoreVisibleMessageAnchor,
    settleVisibleMessageAnchor,
} from '../public/scripts/chat-render-lifecycle/anchor.js';

class FakeMessageElement {
    constructor(messageId, rect) {
        this.messageId = String(messageId);
        this.rect = rect;
    }

    getAttribute(attribute) {
        return attribute === 'mesid' ? this.messageId : null;
    }

    getBoundingClientRect() {
        return this.rect;
    }
}

class FakeScrollElement {
    constructor(messages, rect = { top: 0, bottom: 100 }) {
        this.messages = messages;
        this.rect = rect;
        this.scrollTop = 0;
    }

    getBoundingClientRect() {
        return this.rect;
    }

    querySelectorAll(selector) {
        return selector === '.mes[mesid]' ? this.messages : [];
    }
}

describe('chat render lifecycle anchor helpers', () => {
    test('captures the first message intersecting the chat viewport', () => {
        const messages = [
            new FakeMessageElement(4, { top: -120, bottom: -20 }),
            new FakeMessageElement(5, { top: 24, bottom: 84 }),
            new FakeMessageElement(6, { top: 90, bottom: 160 }),
        ];

        expect(captureVisibleMessageAnchor(new FakeScrollElement(messages))).toEqual({
            messageId: '5',
            offsetTop: 24,
        });
    });

    test('restores the captured message to the same viewport offset', () => {
        const anchorMessage = new FakeMessageElement(5, { top: 24, bottom: 84 });
        const scrollElement = new FakeScrollElement([anchorMessage]);
        const anchor = captureVisibleMessageAnchor(scrollElement);

        anchorMessage.rect = { top: 96, bottom: 156 };
        restoreVisibleMessageAnchor(scrollElement, anchor);

        expect(scrollElement.scrollTop).toBe(72);
    });

    test('settles the anchor across multiple animation frames', async () => {
        const anchorMessage = new FakeMessageElement(5, { top: 10, bottom: 60 });
        const scrollElement = new FakeScrollElement([anchorMessage]);
        const anchor = captureVisibleMessageAnchor(scrollElement);
        const frameCallbacks = [];
        const settling = settleVisibleMessageAnchor(scrollElement, anchor, {
            frames: 2,
            requestAnimationFrameRef: callback => frameCallbacks.push(callback),
        });

        anchorMessage.rect = { top: 40, bottom: 90 };
        frameCallbacks.shift()();
        await Promise.resolve();
        expect(scrollElement.scrollTop).toBe(30);

        anchorMessage.rect = { top: 65, bottom: 115 };
        frameCallbacks.shift()();
        await settling;
        expect(scrollElement.scrollTop).toBe(85);
    });

    test('ignores missing scroll elements and anchors', () => {
        expect(captureVisibleMessageAnchor(null)).toBeNull();

        const scrollElement = new FakeScrollElement([]);
        restoreVisibleMessageAnchor(scrollElement, null);

        expect(scrollElement.scrollTop).toBe(0);
    });
});
