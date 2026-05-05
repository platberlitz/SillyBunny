import process from 'node:process';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

function decodePayload(encoded) {
    const decoded = Buffer.from(String(encoded ?? ''), 'base64').toString('utf8');
    return JSON.parse(decoded);
}

function isProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error?.code !== 'ESRCH';
    }
}

function buildVisibleWindowsCommand(command, cwd) {
    const quoted = command.map(value => `"${String(value).replace(/"/g, '\\"')}"`).join(' ');
    const title = 'SillyBunny Server';
    return [
        'cmd.exe',
        [
            '/d',
            '/s',
            '/c',
            'start',
            `"${title}"`,
            '/D',
            `"${cwd}"`,
            'cmd.exe',
            '/k',
            quoted,
        ],
    ];
}

async function waitForParentExit(pid) {
    while (isProcessAlive(pid)) {
        await delay(250);
    }
}

async function main() {
    const payload = decodePayload(process.argv[2]);
    const parentPid = Number(payload?.parentPid);
    const command = Array.isArray(payload?.command) ? payload.command : [];
    const cwd = String(payload?.cwd ?? process.cwd());
    const envPatch = payload?.envPatch && typeof payload.envPatch === 'object' ? payload.envPatch : {};
    const visibleRelaunch = Boolean(payload?.visibleRelaunch);

    if (!Number.isFinite(parentPid) || command.length < 2) {
        process.exit(1);
    }

    await waitForParentExit(parentPid);
    await delay(800);

    const relaunch = visibleRelaunch && process.platform === 'win32'
        ? buildVisibleWindowsCommand(command, cwd)
        : [command[0], command.slice(1)];

    const child = spawn(relaunch[0], relaunch[1], {
        cwd,
        detached: true,
        stdio: visibleRelaunch && process.platform === 'win32' ? ['ignore', 'inherit', 'inherit'] : 'ignore',
        env: { ...process.env, ...envPatch },
        windowsHide: false,
    });

    child.unref();
}

try {
    await main();
    process.exit(0);
} catch (error) {
    console.error('Restart helper failed.', error);
    process.exit(1);
}
