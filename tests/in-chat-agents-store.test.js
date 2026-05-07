/* global globalThis */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

describe('in-chat agent scoped enabled state', () => {
    let context;
    let extensionSettings;
    let saveSettingsDebounced;

    async function importStore() {
        jest.resetModules();

        context = { groupId: null };
        extensionSettings = {};
        saveSettingsDebounced = jest.fn();

        await jest.unstable_mockModule('../public/script.js', () => ({
            getRequestHeaders: jest.fn(() => ({})),
            saveSettingsDebounced,
        }));

        await jest.unstable_mockModule('../public/scripts/extensions.js', () => ({
            extension_settings: extensionSettings,
            getContext: jest.fn(() => context),
        }));

        await jest.unstable_mockModule('../public/scripts/utils.js', () => ({
            regexFromString: jest.fn(value => {
                const match = String(value ?? '').match(/^\/([\s\S]*)\/([a-z]*)$/i);
                return match ? new RegExp(match[1], match[2]) : new RegExp(String(value ?? ''));
            }),
            uuidv4: jest.fn(() => 'test-uuid'),
        }));

        return await import('../public/scripts/extensions/in-chat-agents/agent-store.js');
    }

    beforeEach(() => {
        delete globalThis.fetch;
    });

    function useAgents(store) {
        store.loadAgents([
            {
                id: 'agent-individual',
                name: 'Individual Agent',
                enabled: true,
                category: 'custom',
                injection: { order: 10 },
            },
            {
                id: 'agent-group',
                name: 'Group Agent',
                enabled: false,
                category: 'tool',
                injection: { order: 20 },
            },
        ]);
    }

    test('keeps individual and group enabled agents separate when scoped toggles are enabled', async () => {
        const store = await importStore();
        useAgents(store);

        expect(store.getEnabledAgents().map(agent => agent.id)).toEqual(['agent-individual']);

        store.setGlobalSettings({ separateRecentChats: true });
        expect(store.initializeScopedAgentEnableState()).toBe(true);
        expect(store.getEnabledAgents().map(agent => agent.id)).toEqual(['agent-individual']);

        context.groupId = 'group-1';
        expect(store.getEnabledAgents()).toEqual([]);

        const groupAgent = store.getAgentById('agent-group');
        store.setAgentEnabledForCurrentScope(groupAgent, true);
        expect(store.getEnabledAgents().map(agent => agent.id)).toEqual(['agent-group']);
        expect(store.getEnabledToolAgents().map(agent => agent.id)).toEqual(['agent-group']);

        context.groupId = null;
        expect(store.getEnabledAgents().map(agent => agent.id)).toEqual(['agent-individual']);
    });

    test('persists scoped global settings without changing extension state shape', async () => {
        const store = await importStore();
        useAgents(store);

        store.setGlobalSettings({ separateRecentChats: true });
        store.initializeScopedAgentEnableState();
        store.persistAgentGlobalSettings();

        expect(extensionSettings.inChatAgents.globalSettings.enabledAgentIdsByChatType).toEqual({
            individual: ['agent-individual'],
            group: [],
        });
        expect(saveSettingsDebounced).toHaveBeenCalledTimes(1);
    });

    test('recovers legacy enabled agents missing from initialized scoped settings', async () => {
        const store = await importStore();
        store.setGlobalSettings({
            separateRecentChats: true,
            scopedEnabledAgentIdsInitialized: true,
            enabledAgentIdsByChatType: {
                individual: ['agent-individual'],
                group: [],
            },
        });
        store.loadAgents([
            {
                id: 'agent-individual',
                name: 'Individual Agent',
                enabled: true,
                category: 'custom',
                injection: { order: 10 },
            },
            {
                id: 'agent-post',
                name: 'Saved Post Agent',
                enabled: true,
                category: 'content',
                injection: { order: 20 },
                phase: 'post',
            },
            {
                id: 'agent-disabled',
                name: 'Disabled Agent',
                enabled: false,
                category: 'custom',
                injection: { order: 30 },
            },
        ]);

        expect(store.getEnabledAgents().map(agent => agent.id)).toEqual(['agent-individual']);
        expect(store.reconcileScopedEnabledAgentIdsFromLegacyFlags()).toBe(true);
        expect(store.getEnabledAgents().map(agent => agent.id)).toEqual(['agent-individual', 'agent-post']);
        expect(store.getGlobalSettings().enabledAgentIdsByChatType).toEqual({
            individual: ['agent-individual', 'agent-post'],
            group: [],
        });
    });

    test('preserves disabled Pathfinder summary tool toggles while normalizing agents', async () => {
        const store = await importStore();
        store.loadAgents([
            {
                id: 'pathfinder-agent',
                name: 'Pathfinder',
                category: 'tool',
                sourceTemplateId: 'tpl-pathfinder',
                tools: [
                    { name: 'Pathfinder_Summarize', enabled: false },
                    { name: 'Pathfinder_Search', enabled: true },
                ],
            },
        ]);

        expect(store.getAgentById('pathfinder-agent').tools).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Pathfinder_Summarize', enabled: false }),
            expect.objectContaining({ name: 'Pathfinder_Search', enabled: true }),
        ]));
    });

    test('removes duplicate Pathfinder template agents while keeping the bundled automatic entry', async () => {
        const store = await importStore();
        const templates = [{
            id: 'tpl-pathfinder',
            name: 'Pathfinder',
            prompt: '',
            category: 'tool',
        }];
        const agents = [
            {
                id: 'keep-pathfinder',
                name: 'Pathfinder',
                prompt: '',
                category: 'tool',
                sourceTemplateId: 'tpl-pathfinder',
                author: 'SillyBunny',
                tools: [{ name: 'Pathfinder_Search' }],
            },
            {
                id: 'duplicate-pathfinder',
                name: 'Pathfinder',
                prompt: '',
                category: 'tool',
                author: 'SillyBunny',
                tools: [{ name: 'Pathfinder_Search' }],
            },
            {
                id: 'custom-locked-pathfinder',
                name: 'Pathfinder',
                prompt: '',
                category: 'tool',
                sourceTemplateId: 'tpl-pathfinder',
                author: 'SillyBunny',
                phaseLocked: true,
                tools: [{ name: 'Pathfinder_Search' }],
            },
        ];

        expect(store.getRedundantBundledAgentDuplicateIds(agents, templates)).toEqual(['duplicate-pathfinder']);
    });
});
