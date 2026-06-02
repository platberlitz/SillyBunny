import { describe, expect, jest, test } from '@jest/globals';

await jest.unstable_mockModule('../public/scripts/extensions/quick-reply/src/QuickReply.js', () => ({
    QuickReply: class QuickReply {},
}));

await jest.unstable_mockModule('../public/scripts/extensions/quick-reply/src/QuickReplySettings.js', () => ({
    QuickReplySettings: class QuickReplySettings {},
}));

await jest.unstable_mockModule('../public/scripts/extensions/quick-reply/src/shared.js', () => ({
    warn: jest.fn(),
}));

const { AutoExecuteHandler } = await import('../public/scripts/extensions/quick-reply/src/AutoExecuteHandler.js');

function createQuickReply(label) {
    return {
        label,
        executeOnUser: true,
        execute: jest.fn(async () => undefined),
    };
}

describe('Quick Reply auto-execute handling', () => {
    test('collects one command when active scopes contain duplicate set names', () => {
        const firstQr = createQuickReply('first');
        const duplicateQr = createQuickReply('duplicate');
        const handler = new AutoExecuteHandler({
            isEnabled: true,
            config: {
                setList: [{ set: { name: 'Memory Sharding', qrList: [firstQr] } }],
            },
            chatConfig: {
                setList: [{ set: { name: ' memory sharding ', qrList: [duplicateQr] } }],
            },
        });

        expect(handler.getCommands('executeOnUser')).toEqual([firstQr]);
    });
});
