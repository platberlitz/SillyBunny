import { beforeEach, describe, expect, jest, test } from '@jest/globals';

await jest.unstable_mockModule('../public/scripts/extensions/quick-reply/src/QuickReply.js', () => ({
    QuickReply: class QuickReply {},
}));

await jest.unstable_mockModule('../public/scripts/extensions/quick-reply/src/QuickReplyContextLink.js', () => ({
    QuickReplyContextLink: class QuickReplyContextLink {},
}));

class MockQuickReplySet {
    static list = [];

    static get(name) {
        const key = String(name ?? '').trim().toLowerCase();
        return this.list.find(set => String(set.name ?? '').trim().toLowerCase() === key);
    }
}

await jest.unstable_mockModule('../public/scripts/extensions/quick-reply/src/QuickReplySet.js', () => ({
    QuickReplySet: MockQuickReplySet,
}));

await jest.unstable_mockModule('../public/scripts/extensions/quick-reply/src/QuickReplySettings.js', () => ({
    QuickReplySettings: class QuickReplySettings {},
}));

await jest.unstable_mockModule('../public/scripts/extensions/quick-reply/src/ui/SettingsUi.js', () => ({
    SettingsUi: class SettingsUi {},
}));

await jest.unstable_mockModule('../public/scripts/utils.js', () => ({
    onlyUnique: (value, index, array) => array.indexOf(value) === index,
}));

const { QuickReplyApi } = await import('../public/scripts/extensions/quick-reply/api/QuickReplyApi.js');

function createQuickReply(label) {
    return {
        label,
        onExecute: jest.fn(async () => label),
    };
}

function createSet(name, labels = []) {
    return {
        name,
        qrList: labels.map(createQuickReply),
    };
}

function createApi(settings) {
    return new QuickReplyApi(settings, { rerender: jest.fn() });
}

beforeEach(() => {
    MockQuickReplySet.list = [];
});

describe('Quick Reply API set listing', () => {
    test('finds sets by normalized display name', () => {
        const memorySet = createSet('Memory Sharding');
        MockQuickReplySet.list = [memorySet];
        const api = createApi({ config: { setList: [] } });

        expect(api.getSetByName(' memory sharding ')).toBe(memorySet);
    });

    test('deduplicates global and chat set names and ignores unresolved links', () => {
        const globalSet = createSet('Memory Sharding');
        const duplicateGlobalSet = createSet(' memory sharding ');
        const chatSet = createSet('Chat Tools');
        const api = createApi({
            config: {
                setList: [
                    { set: globalSet },
                    { set: duplicateGlobalSet },
                    { set: null },
                ],
            },
            chatConfig: {
                setList: [
                    { set: chatSet },
                    { set: createSet(' chat tools ') },
                    { set: null },
                ],
            },
        });

        expect(api.listGlobalSets()).toEqual(['Memory Sharding']);
        expect(api.listChatSets()).toEqual(['Chat Tools']);
    });

    test('executes quick replies by index from the first active set for duplicate names', async () => {
        const firstSet = createSet('Memory Sharding', ['first']);
        const duplicateSet = createSet(' memory sharding ', ['duplicate']);
        const secondSet = createSet('Chat Tools', ['second']);
        const api = createApi({
            config: {
                setList: [{ set: firstSet }, { set: duplicateSet }],
            },
            chatConfig: {
                setList: [{ set: secondSet }],
            },
        });

        await expect(api.executeQuickReplyByIndex(0)).resolves.toBe('first');
        await expect(api.executeQuickReplyByIndex(1)).resolves.toBe('second');
        expect(firstSet.qrList[0].onExecute).toHaveBeenCalledTimes(1);
        expect(duplicateSet.qrList[0].onExecute).not.toHaveBeenCalled();
        expect(secondSet.qrList[0].onExecute).toHaveBeenCalledTimes(1);
    });
});
