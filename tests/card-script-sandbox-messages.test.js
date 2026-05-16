import { describe, expect, test } from '@jest/globals';
import {
    MESSAGE_TYPE,
    MESSAGE_VERSION,
    validateSlashRequestMessage,
} from '../public/scripts/card-script-sandbox/messages.js';

const canonicalMessage = Object.freeze({
    type: MESSAGE_TYPE,
    version: MESSAGE_VERSION,
    messageId: 5,
    nonce: 'nonce-5',
    command: '/echo hello',
});

const nonObjectPayloads = [
    null,
    undefined,
    '/echo hello',
    1,
    [],
    new Date(),
];

const badMessageIds = [
    undefined,
    '5',
    1.5,
    -1,
];

const badNonces = [
    undefined,
    123,
    '',
    '   ',
];

const badCommands = [
    undefined,
    123,
    null,
];

describe('card script sandbox message validation', () => {
    test('accepts the canonical slash request shape', () => {
        expect(validateSlashRequestMessage(canonicalMessage)).toEqual({
            ok: true,
            value: canonicalMessage,
        });
    });

    test('rejects non-object payloads', () => {
        for (const data of nonObjectPayloads) {
            expect(validateSlashRequestMessage(data)).toEqual({ ok: false, reason: 'not_object' });
        }
    });

    test('rejects wrong type and version values', () => {
        expect(validateSlashRequestMessage({ ...canonicalMessage, type: 'other' })).toEqual({
            ok: false,
            reason: 'wrong_type',
        });
        expect(validateSlashRequestMessage({ ...canonicalMessage, version: 2 })).toEqual({
            ok: false,
            reason: 'wrong_version',
        });
    });

    test('rejects bad messageId values', () => {
        for (const messageId of badMessageIds) {
            expect(validateSlashRequestMessage({ ...canonicalMessage, messageId })).toEqual({
                ok: false,
                reason: 'bad_message_id',
            });
        }
    });

    test('rejects bad nonce values', () => {
        for (const nonce of badNonces) {
            expect(validateSlashRequestMessage({ ...canonicalMessage, nonce })).toEqual({
                ok: false,
                reason: 'bad_nonce',
            });
        }
    });

    test('rejects non-string commands', () => {
        for (const command of badCommands) {
            expect(validateSlashRequestMessage({ ...canonicalMessage, command })).toEqual({
                ok: false,
                reason: 'bad_command',
            });
        }
    });

    test('rejects oversized commands', () => {
        expect(validateSlashRequestMessage({ ...canonicalMessage, command: 'abcd' }, { maxCommandLength: 3 })).toEqual({
            ok: false,
            reason: 'command_too_long',
        });
    });
});
