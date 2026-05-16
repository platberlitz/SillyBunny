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

describe('card script sandbox message validation', () => {
    test('accepts the canonical slash request shape', () => {
        expect(validateSlashRequestMessage(canonicalMessage)).toEqual({
            ok: true,
            value: canonicalMessage,
        });
    });

    test.each([
        null,
        undefined,
        '/echo hello',
        1,
        [],
        new Date(),
    ])('rejects non-object payload %#', (data) => {
        expect(validateSlashRequestMessage(data)).toEqual({ ok: false, reason: 'not_object' });
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

    test.each([
        undefined,
        '5',
        1.5,
        -1,
    ])('rejects bad messageId %#', (messageId) => {
        expect(validateSlashRequestMessage({ ...canonicalMessage, messageId })).toEqual({
            ok: false,
            reason: 'bad_message_id',
        });
    });

    test.each([
        undefined,
        123,
        '',
        '   ',
    ])('rejects bad nonce %#', (nonce) => {
        expect(validateSlashRequestMessage({ ...canonicalMessage, nonce })).toEqual({
            ok: false,
            reason: 'bad_nonce',
        });
    });

    test.each([
        undefined,
        123,
        null,
    ])('rejects non-string command %#', (command) => {
        expect(validateSlashRequestMessage({ ...canonicalMessage, command })).toEqual({
            ok: false,
            reason: 'bad_command',
        });
    });

    test('rejects oversized commands', () => {
        expect(validateSlashRequestMessage({ ...canonicalMessage, command: 'abcd' }, { maxCommandLength: 3 })).toEqual({
            ok: false,
            reason: 'command_too_long',
        });
    });
});
