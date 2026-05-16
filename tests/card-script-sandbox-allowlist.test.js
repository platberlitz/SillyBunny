import { describe, expect, test } from '@jest/globals';
import {
    DEFAULT_ALLOWLIST,
    POLICY_MODES,
    createDefaultPolicy,
    parseSlashCommandRequest,
} from '../public/scripts/card-script-sandbox/allowlist.js';

const allowedCommandCases = [
    ['/echo hello', '/echo hello'],
    ['/buttons label=Continue', '/buttons label=Continue'],
    ['/popup text=hello', '/popup text=hello'],
    ['/getchatname', '/getchatname'],
];

const riskyCommands = [
    '/send hello',
    '/gen',
    '/world',
    '/import data',
    '/export chat',
    '/setting key=value',
    '/run script',
    '/sys prompt',
    '/sd prompt',
    '/api call',
    '/preset load',
];

const malformedInputCases = [
    ['', 'empty_input'],
    ['   ', 'empty_input'],
    ['echo hello', 'malformed'],
    ['|/echo hello', 'malformed'],
    ['/echo hello|', 'malformed'],
    ['|', 'malformed'],
    ['/echo hello||/popup hi', 'malformed'],
    [null, 'malformed'],
];

describe('card script sandbox allowlist', () => {
    test('keeps the initial safe command set explicit', () => {
        expect(DEFAULT_ALLOWLIST).toEqual([
            '/audioselect',
            '/audiomode',
            '/audioplay',
            '/echo',
            '/buttons',
            '/popup',
            '/getchatname',
        ]);
    });

    test('accepts the issue 94 audio pipeline and normalizes command names', () => {
        const result = parseSlashCommandRequest(' /AUDIOSELECT voice=bell | /audiomode narrator | /audioplay ');

        expect(result).toEqual({
            ok: true,
            command: '/audioselect voice=bell|/audiomode narrator|/audioplay',
            commands: ['/audioselect voice=bell', '/audiomode narrator', '/audioplay'],
        });
    });

    test('accepts allowed commands', () => {
        for (const [raw, normalized] of allowedCommandCases) {
            expect(parseSlashCommandRequest(raw)).toMatchObject({
                ok: true,
                command: normalized,
            });
        }
    });

    test('denies risky commands', () => {
        for (const raw of riskyCommands) {
            expect(parseSlashCommandRequest(raw)).toEqual({
                ok: false,
                reason: 'command_not_allowed',
            });
        }
    });

    test('rejects malformed input', () => {
        for (const [raw, reason] of malformedInputCases) {
            expect(parseSlashCommandRequest(raw)).toEqual({ ok: false, reason });
        }
    });

    test('enforces command length and pipeline count caps', () => {
        expect(parseSlashCommandRequest(`/echo ${'x'.repeat(1995)}`)).toEqual({
            ok: false,
            reason: 'too_long',
        });
        expect(parseSlashCommandRequest(new Array(6).fill('/echo ok').join('|'))).toEqual({
            ok: false,
            reason: 'too_many_commands',
        });
    });

    test('fails closed for disabled or unknown policy modes', () => {
        expect(parseSlashCommandRequest('/echo hello', createDefaultPolicy({ mode: POLICY_MODES.DISABLED }))).toEqual({
            ok: false,
            reason: 'policy_disabled',
        });
        expect(parseSlashCommandRequest('/echo hello', { mode: 'unknown', allowlist: DEFAULT_ALLOWLIST })).toEqual({
            ok: false,
            reason: 'policy_disabled',
        });
    });

    test('treats advanced mode as allowlist-only until runtime policy is wired', () => {
        const policy = createDefaultPolicy({ mode: POLICY_MODES.ADVANCED });

        expect(parseSlashCommandRequest('/ECHO Hello', policy)).toMatchObject({
            ok: true,
            command: '/echo Hello',
        });
        expect(parseSlashCommandRequest('/send Hello', policy)).toMatchObject({
            ok: false,
            reason: 'command_not_allowed',
        });
    });
});
