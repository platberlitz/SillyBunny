export const POLICY_MODES = Object.freeze({
    DISABLED: 'disabled',
    ALLOWLIST: 'allowlist',
    ADVANCED: 'advanced',
});

export const DEFAULT_ALLOWLIST = Object.freeze([
    '/audioselect',
    '/audiomode',
    '/audioplay',
    '/echo',
    '/getchatname',
]);

export const DEFAULT_ADVANCED_ALLOWLIST = Object.freeze([
    ...DEFAULT_ALLOWLIST,
    '/buttons',
    '/popup',
]);

export const DEFAULT_LIMITS = Object.freeze({
    maxCommandLength: 2000,
    maxPipedCommands: 5,
});

export function createDefaultPolicy(overrides = {}) {
    const mode = overrides.mode ?? POLICY_MODES.DISABLED;

    return {
        mode,
        allowlist: buildAllowlistSet(overrides.allowlist ?? getDefaultAllowlistForMode(mode)),
        limits: {
            ...DEFAULT_LIMITS,
            ...(overrides.limits ?? {}),
        },
    };
}

export function parseSlashCommandRequest(raw, policy = createDefaultPolicy()) {
    const activePolicy = normalizePolicy(policy);

    if (activePolicy.mode === POLICY_MODES.DISABLED) {
        return { ok: false, reason: 'policy_disabled' };
    }

    if (typeof raw !== 'string') {
        return { ok: false, reason: 'malformed' };
    }

    const trimmed = raw.trim();
    if (!trimmed) {
        return { ok: false, reason: 'empty_input' };
    }

    if (trimmed.length > activePolicy.limits.maxCommandLength) {
        return { ok: false, reason: 'too_long' };
    }

    const pipeline = splitSlashPipeline(trimmed);
    if (!pipeline.ok) {
        return pipeline;
    }

    const { segments } = pipeline;
    if (segments.length > activePolicy.limits.maxPipedCommands) {
        return { ok: false, reason: 'too_many_commands' };
    }

    const commands = [];

    for (const segment of segments) {
        const parsed = parseCommandSegment(segment, activePolicy.allowlist);
        if (!parsed.ok) {
            return parsed;
        }

        commands.push(parsed.command);
    }

    return {
        ok: true,
        command: commands.join('|'),
        commands,
    };
}

function normalizePolicy(policy) {
    if (!policy || typeof policy !== 'object') {
        return createDefaultPolicy();
    }

    const validModes = new Set(Object.values(POLICY_MODES));
    const mode = validModes.has(policy.mode) ? policy.mode : POLICY_MODES.DISABLED;

    return {
        mode,
        allowlist: buildAllowlistSet(policy.allowlist ?? getDefaultAllowlistForMode(mode)),
        limits: {
            ...DEFAULT_LIMITS,
            ...(policy.limits ?? {}),
        },
    };
}

function parseCommandSegment(segment, allowlist) {
    const trimmed = segment.trim();

    if (!trimmed || !trimmed.startsWith('/')) {
        return { ok: false, reason: 'malformed' };
    }

    const match = trimmed.match(/^\/[^\s|]+/);
    if (!match) {
        return { ok: false, reason: 'malformed' };
    }

    const commandName = match[0].toLowerCase();
    if (!allowlist.has(commandName)) {
        return { ok: false, reason: 'command_not_allowed' };
    }

    const args = trimmed.slice(match[0].length).trim();
    return {
        ok: true,
        command: args ? `${commandName} ${args}` : commandName,
    };
}

function splitSlashPipeline(input) {
    const segments = [];
    let current = '';
    let quote = '';
    let escaped = false;

    for (const char of input) {
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }

        if (char === '\\') {
            current += char;
            escaped = true;
            continue;
        }

        if (quote) {
            current += char;
            if (char === quote) {
                quote = '';
            }
            continue;
        }

        if (char === '"') {
            current += char;
            quote = char;
            continue;
        }

        if (char === '|') {
            segments.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    if (quote) {
        return { ok: false, reason: 'malformed' };
    }

    segments.push(current);
    return { ok: true, segments };
}

function buildAllowlistSet(allowlist) {
    const allowed = new Set();

    if (!allowlist || typeof allowlist[Symbol.iterator] !== 'function') {
        return allowed;
    }

    for (const command of allowlist) {
        const normalized = normalizeAllowedCommand(command);
        if (normalized) {
            allowed.add(normalized);
        }
    }

    return allowed;
}

function getDefaultAllowlistForMode(mode) {
    return mode === POLICY_MODES.ADVANCED ? DEFAULT_ADVANCED_ALLOWLIST : DEFAULT_ALLOWLIST;
}

function normalizeAllowedCommand(command) {
    if (typeof command !== 'string') {
        return null;
    }

    const trimmed = command.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
