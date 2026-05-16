import { DEFAULT_LIMITS } from './allowlist.js';

export const MESSAGE_TYPE = 'sillybunny-card-script:slash';
export const MESSAGE_VERSION = 1;

export function validateSlashRequestMessage(data, { maxCommandLength = DEFAULT_LIMITS.maxCommandLength } = {}) {
    if (!isPlainRecord(data)) {
        return { ok: false, reason: 'not_object' };
    }

    if (data.type !== MESSAGE_TYPE) {
        return { ok: false, reason: 'wrong_type' };
    }

    if (data.version !== MESSAGE_VERSION) {
        return { ok: false, reason: 'wrong_version' };
    }

    if (!Number.isInteger(data.messageId) || data.messageId < 0) {
        return { ok: false, reason: 'bad_message_id' };
    }

    if (typeof data.nonce !== 'string' || data.nonce.trim() === '') {
        return { ok: false, reason: 'bad_nonce' };
    }

    if (typeof data.command !== 'string') {
        return { ok: false, reason: 'bad_command' };
    }

    if (data.command.length > maxCommandLength) {
        return { ok: false, reason: 'command_too_long' };
    }

    return {
        ok: true,
        value: {
            type: data.type,
            version: data.version,
            messageId: data.messageId,
            nonce: data.nonce,
            command: data.command,
        },
    };
}

function isPlainRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
