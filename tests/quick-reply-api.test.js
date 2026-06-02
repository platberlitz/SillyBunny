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

function createSet(name, labels = [], { deleteResult = true } = {}) {
    return {
        name,
        qrList: labels.map(createQuickReply),
        isDeleted: false,
        deleteResult,
        async delete() {
            this.isDeleted = this.deleteResult;
            return this.deleteResult;
        },
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

    test('deletes sets through the API and purges matching active links across scopes', async () => {
        const targetSet = createSet('Memory Sharding');
        const duplicateLinkedSet = createSet(' memory sharding ');
        const otherSet = createSet('Chat Tools');
        MockQuickReplySet.list = [targetSet, otherSet];
        const settings = {
            save: jest.fn(),
            config: {
                setList: [
                    { set: targetSet },
                    { set: duplicateLinkedSet },
                    { set: otherSet },
                ],
            },
            chatConfig: {
                setList: [
                    { set: duplicateLinkedSet },
                    { set: otherSet },
                ],
            },
            charConfig: {
                setList: [
                    { set: duplicateLinkedSet },
                    { set: otherSet },
                ],
            },
        };
        const settingsUi = { rerender: jest.fn() };
        const api = new QuickReplyApi(settings, settingsUi);

        await api.deleteSet(' memory sharding ');

        expect(targetSet.isDeleted).toBe(true);
        expect(settings.config.setList).toEqual([{ set: otherSet }]);
        expect(settings.chatConfig.setList).toEqual([{ set: otherSet }]);
        expect(settings.charConfig.setList).toEqual([{ set: otherSet }]);
        expect(settings.save).toHaveBeenCalledTimes(1);
        expect(settingsUi.rerender).toHaveBeenCalledTimes(1);
    });

    test('keeps active links when set deletion fails', async () => {
        const targetSet = createSet('Memory Sharding', [], { deleteResult: false });
        const otherSet = createSet('Chat Tools');
        MockQuickReplySet.list = [targetSet, otherSet];
        const settings = {
            save: jest.fn(),
            config: {
                setList: [
                    { set: targetSet },
                    { set: otherSet },
                ],
            },
            chatConfig: {
                setList: [{ set: targetSet }],
            },
            charConfig: {
                setList: [{ set: targetSet }],
            },
        };
        const settingsUi = { rerender: jest.fn() };
        const api = new QuickReplyApi(settings, settingsUi);

        await api.deleteSet('Memory Sharding');

        expect(targetSet.isDeleted).toBe(false);
        expect(settings.config.setList).toEqual([{ set: targetSet }, { set: otherSet }]);
        expect(settings.chatConfig.setList).toEqual([{ set: targetSet }]);
        expect(settings.charConfig.setList).toEqual([{ set: targetSet }]);
        expect(settings.save).not.toHaveBeenCalled();
        expect(settingsUi.rerender).not.toHaveBeenCalled();
    });
});
