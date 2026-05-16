import fs from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const templateDir = new URL('../public/scripts/extensions/in-chat-agents/templates/', import.meta.url);

function readTemplate(filename) {
    return JSON.parse(fs.readFileSync(new URL(filename, templateDir), 'utf8'));
}

function findCatalogTemplate(catalog, templateId) {
    const template = catalog.find(template => template.id === templateId);

    if (!template) {
        throw new Error(`Missing catalog template: ${templateId}`);
    }

    return template;
}

describe('in-chat agent bundled templates', () => {
    test('keeps source files synced with the template browser catalog', () => {
        const catalog = readTemplate('index.json');
        const sourceFilenames = [
            'achievements-tracker.json',
            'npc-motivator.json',
            'scene-tracker.json',
        ];

        for (const filename of sourceFilenames) {
            const source = readTemplate(filename);
            const catalogTemplate = catalog.find(template => template.id === source.id);
            expect(catalogTemplate).toEqual(source);
        }
    });

    test('bundles NPC Motivator as a pre-generation intercept patch agent', () => {
        const template = readTemplate('npc-motivator.json');

        expect(template).toEqual(expect.objectContaining({
            id: 'tpl-npc-motivator',
            name: 'NPC Motivator',
            author: 'Sheep',
            phase: 'pre',
            enabled: false,
        }));
        expect(template.preProcess).toEqual(expect.objectContaining({
            mode: 'intercept',
            applyMode: 'patch',
            patchStartTag: '<npc_motivation_plan>',
            patchEndTag: '</npc_motivation_plan>',
            maxTokens: 4096,
        }));
        expect(template.conditions.generationTypes).toEqual(['normal', 'continue', 'impersonate']);
    });

    test('keeps Prose Polisher enabled for impersonation prompt rewrites in the catalog', () => {
        const catalog = readTemplate('index.json');
        const template = findCatalogTemplate(catalog, 'tpl-prose-polisher');

        expect(template.postProcess).toEqual(expect.objectContaining({
            promptTransformEnabled: true,
            promptTransformMode: 'rewrite',
        }));
        expect(template.conditions).toEqual(expect.objectContaining({
            runOnImpersonate: true,
        }));
    });
});
