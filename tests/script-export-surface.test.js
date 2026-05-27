import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { describe, expect, test } from '@jest/globals';

function getNamedExports(source) {
    const ast = parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'module',
    });

    const exports = [];

    for (const node of ast.body) {
        if (node.type !== 'ExportNamedDeclaration') {
            continue;
        }

        if (node.declaration) {
            if (node.declaration.id) {
                exports.push(node.declaration.id.name);
            }

            if (node.declaration.declarations) {
                for (const declaration of node.declaration.declarations) {
                    exports.push(declaration.id.name);
                }
            }
        }

        for (const specifier of node.specifiers) {
            exports.push(specifier.exported.name ?? specifier.exported.value);
        }
    }

    return exports.sort();
}

describe('public/script.js named export surface', () => {
    test('matches the parser-derived export contract without importing the browser bundle', () => {
        const source = readFileSync(new URL('../public/script.js', import.meta.url), 'utf8');

        expect(getNamedExports(source)).toMatchSnapshot();
    });
});
