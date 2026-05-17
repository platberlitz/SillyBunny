import { describe, expect, test } from '@jest/globals';
import {
    DEFAULT_ADVANCED_ALLOWLIST,
    DEFAULT_ALLOWLIST,
    POLICY_MODES,
    createDefaultPolicy,
    parseSlashCommandRequest,
} from '../public/scripts/card-script-sandbox/allowlist.js';

const allowlistPolicy = createDefaultPolicy({ mode: POLICY_MODES.ALLOWLIST });
const advancedPolicy = createDefaultPolicy({ mode: POLICY_MODES.ADVANCED });

const allowedCommandCases = [
    ['/echo hello', '/echo hello'],
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
    ['/echo "unterminated|/getchatname', 'malformed'],
    ['/echo \'single|quotes\'', 'malformed'],
    [null, 'malformed'],
];

describe('card script sandbox allowlist', () => {
    test('keeps the initial safe command set explicit', () => {
        expect(DEFAULT_ALLOWLIST).toEqual([
            '/audioselect',
            '/audiomode',
            '/audioplay',
            '/echo',
            '/getchatname',
        ]);
        expect(DEFAULT_ADVANCED_ALLOWLIST).toEqual([
            ...DEFAULT_ALLOWLIST,
            '/buttons',
            '/popup',
        ]);
    });

    test('accepts the issue 94 audio pipeline and normalizes command names', () => {
        const result = parseSlashCommandRequest(' /AUDIOSELECT voice=bell | /audiomode narrator | /audioplay ', allowlistPolicy);

        expect(result).toEqual({
            ok: true,
            command: '/audioselect voice=bell|/audiomode narrator|/audioplay',
            commands: ['/audioselect voice=bell', '/audiomode narrator', '/audioplay'],
        });
    });

    test('accepts allowed commands', () => {
        for (const [raw, normalized] of allowedCommandCases) {
            expect(parseSlashCommandRequest(raw, allowlistPolicy)).toMatchObject({
                ok: true,
                command: normalized,
            });
        }
    });

    test('denies risky commands', () => {
        for (const raw of riskyCommands) {
            expect(parseSlashCommandRequest(raw, allowlistPolicy)).toEqual({
                ok: false,
                reason: 'command_not_allowed',
            });
        }
    });

    test('keeps modal-producing commands out of the default allowlist tier', () => {
        for (const raw of ['/buttons label=Continue', '/popup text=hello']) {
            expect(parseSlashCommandRequest(raw, allowlistPolicy)).toEqual({
                ok: false,
                reason: 'command_not_allowed',
            });
            expect(parseSlashCommandRequest(raw, advancedPolicy)).toMatchObject({
                ok: true,
                command: raw,
            });
        }
    });

    test('rejects malformed input', () => {
        for (const [raw, reason] of malformedInputCases) {
            expect(parseSlashCommandRequest(raw, allowlistPolicy)).toEqual({ ok: false, reason });
        }
    });

    test('enforces command length and pipeline count caps', () => {
        expect(parseSlashCommandRequest(`/echo ${'x'.repeat(1995)}`, allowlistPolicy)).toEqual({
            ok: false,
            reason: 'too_long',
        });
        expect(parseSlashCommandRequest(`  /echo ${'x'.repeat(1994)}  `, allowlistPolicy)).toMatchObject({
            ok: true,
        });
        expect(parseSlashCommandRequest(new Array(6).fill('/echo ok').join('|'), allowlistPolicy)).toEqual({
            ok: false,
            reason: 'too_many_commands',
        });
    });

    test('treats quoted or escaped pipes as command arguments', () => {
        expect(parseSlashCommandRequest('/echo "a|b" | /getchatname', allowlistPolicy)).toEqual({
            ok: true,
            command: '/echo "a|b"|/getchatname',
            commands: ['/echo "a|b"', '/getchatname'],
        });
        expect(parseSlashCommandRequest('/echo a\\|b | /getchatname', allowlistPolicy)).toEqual({
            ok: true,
            command: '/echo a\\|b|/getchatname',
            commands: ['/echo a\\|b', '/getchatname'],
        });
    });

    test('fails closed for disabled or unknown policy modes', () => {
        expect(parseSlashCommandRequest('/echo hello')).toEqual({
            ok: false,
            reason: 'policy_disabled',
        });
        expect(createDefaultPolicy()).toMatchObject({
            mode: POLICY_MODES.DISABLED,
        });
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
        expect(parseSlashCommandRequest('/ECHO Hello', advancedPolicy)).toMatchObject({
            ok: true,
            command: '/echo Hello',
        });
        expect(parseSlashCommandRequest('/send Hello', advancedPolicy)).toMatchObject({
            ok: false,
            reason: 'command_not_allowed',
        });
    });
});
