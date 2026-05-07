import fs from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const templateDir = new URL('../public/scripts/extensions/in-chat-agents/templates/', import.meta.url);

function readTemplate(filename) {
    return JSON.parse(fs.readFileSync(new URL(filename, templateDir), 'utf8'));
}

describe('in-chat agent bundled templates', () => {
    test('keeps tracker source files synced with the template browser catalog', () => {
        const catalog = readTemplate('index.json');
        const sourceFilenames = [
            'achievements-tracker.json',
            'scene-tracker.json',
        ];

        for (const filename of sourceFilenames) {
            const source = readTemplate(filename);
            const catalogTemplate = catalog.find(template => template.id === source.id);
            expect(catalogTemplate).toEqual(source);
        }
    });
});
