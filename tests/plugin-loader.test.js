import { afterEach, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDirs = [];

function createPluginsDirectory() {
    const pluginsPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sillybunny-plugin-loader-'));
    tempDirs.push(pluginsPath);
    return pluginsPath;
}

async function importPluginLoader(config) {
    jest.resetModules();

    const effectiveConfig = {
        enableServerPluginsAutoUpdate: false,
        ...config,
    };

    await jest.unstable_mockModule('../src/util.js', () => ({
        color: {
            blue: value => value,
            cyan: value => value,
            green: value => value,
            red: value => value,
            yellow: value => value,
        },
        getConfig: jest.fn(() => effectiveConfig),
        getConfigValue: jest.fn((key, defaultValue) => Object.prototype.hasOwnProperty.call(effectiveConfig, key) ? effectiveConfig[key] : defaultValue),
    }));

    await jest.unstable_mockModule('command-exists', () => ({
        sync: jest.fn(() => false),
    }));

    await jest.unstable_mockModule('simple-git', () => ({
        CheckRepoActions: {
            IS_REPO_ROOT: 'IS_REPO_ROOT',
        },
        default: jest.fn(() => ({
            checkIsRepo: jest.fn(async () => false),
        })),
    }));

    return await import('../src/plugin-loader.js');
}

function createApp() {
    return { use: jest.fn() };
}

afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();

    for (const dir of tempDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

describe('plugin loader diagnostics', () => {
    test('warns when a singular server plugin config key leaves installed plugins disabled', async () => {
        const pluginsPath = createPluginsDirectory();
        fs.mkdirSync(path.join(pluginsPath, 'similharity'));
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { loadPlugins } = await importPluginLoader({
            enableserverplugin: true,
            enableServerPlugins: false,
        });

        await loadPlugins(createApp(), pluginsPath);

        const warnings = warnSpy.mock.calls.flat().join('\n');
        expect(warnings).toContain('Config key \'enableserverplugin\' is ignored');
        expect(warnings).toContain('Did you mean \'enableServerPlugins\'');
        expect(warnings).toContain('Server plugins are installed');
        expect(warnings).toContain('enableServerPlugins: true');
    });

    test('prints an install hint when a plugin package dependency is missing', async () => {
        const pluginsPath = createPluginsDirectory();
        const pluginPath = path.join(pluginsPath, 'similharity');
        fs.mkdirSync(pluginPath);
        fs.writeFileSync(path.join(pluginPath, 'package.json'), JSON.stringify({
            type: 'module',
            main: 'index.mjs',
        }));
        fs.writeFileSync(path.join(pluginPath, 'index.mjs'), 'import \'@lancedb/lancedb\';\n');
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const { loadPlugins } = await importPluginLoader({
            enableServerPlugins: true,
        });

        await loadPlugins(createApp(), pluginsPath);

        const errors = errorSpy.mock.calls.flat().join('\n');
        expect(errors).toContain('Server plugin dependency \'@lancedb/lancedb\' was not found');
        expect(errors).toContain(`cd "${pluginPath}" && npm install`);
        expect(errors).toContain('bun install');
        expect(errors).toContain('node_modules is busy');
    });
});
