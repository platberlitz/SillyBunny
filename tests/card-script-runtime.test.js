/* global globalThis */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { eventSource, event_types } from '../public/scripts/events.js';
import { MESSAGE_TYPE, MESSAGE_VERSION } from '../public/scripts/card-script-sandbox/messages.js';
import {
    configureCardScriptRuntime,
    createSandbox,
    destroySandbox,
    executeSandboxCommand,
    getActiveSandboxCount,
    handleSandboxMessage,
    initCardScriptRuntime,
    resetCardScriptRuntimeForTests,
    syncCardScriptButtonForMessage,
} from '../public/scripts/card-script-runtime.js';

class FakeClassList {
    constructor(initialClasses = []) {
        this.classes = new Set(initialClasses);
    }

    add(...classes) {
        classes.forEach(className => this.classes.add(className));
    }

    remove(...classes) {
        classes.forEach(className => this.classes.delete(className));
    }

    toggle(className, force) {
        if (force === true) {
            this.classes.add(className);
            return true;
        }

        if (force === false) {
            this.classes.delete(className);
            return false;
        }

        if (this.classes.has(className)) {
            this.classes.delete(className);
            return false;
        }

        this.classes.add(className);
        return true;
    }

    contains(className) {
        return this.classes.has(className);
    }
}

class FakeElement extends EventTarget {
    constructor(tagName, classNames = []) {
        super();
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.parentElement = null;
        this.parentNode = null;
        this.attributes = new Map();
        this.dataset = {};
        this.style = {};
        this.classList = new FakeClassList(classNames);
        this.removed = false;

        if (tagName.toLowerCase() === 'iframe') {
            this.contentWindow = { postMessage: jest.fn() };
        }
    }

    set className(value) {
        this.classList = new FakeClassList(String(value ?? '').split(/\s+/).filter(Boolean));
    }

    get className() {
        return [...this.classList.classes].join(' ');
    }

    appendChild(child) {
        child.parentElement = this;
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    remove() {
        this.removed = true;
        if (!this.parentElement) {
            return;
        }

        this.parentElement.children = this.parentElement.children.filter(child => child !== this);
        this.parentElement = null;
        this.parentNode = null;
    }

    contains(node) {
        if (node === this) {
            return true;
        }

        return this.children.some(child => child.contains?.(node));
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] ?? null;
    }

    querySelectorAll(selector) {
        const matches = [];

        const visit = (node) => {
            if (node.matches?.(selector)) {
                matches.push(node);
            }

            for (const child of node.children ?? []) {
                visit(child);
            }
        };

        for (const child of this.children) {
            visit(child);
        }

        return matches;
    }

    matches(selector) {
        if (selector === '.mes') {
            return this.classList.contains('mes');
        }

        if (selector === '.mes_run_card_scripts') {
            return this.classList.contains('mes_run_card_scripts');
        }

        if (selector === 'custom-card-script-marker') {
            return this.tagName.toLowerCase() === 'custom-card-script-marker';
        }

        const messageMatch = selector.match(/^\.mes\[mesid="(\d+)"\]$/);
        if (messageMatch) {
            return this.classList.contains('mes') && this.getAttribute('mesid') === messageMatch[1];
        }

        return false;
    }

    closest(selector) {
        let node = this;
        while (node) {
            if (node.matches?.(selector)) {
                return node;
            }
            node = node.parentElement;
        }

        return null;
    }
}

class FakeDocument extends EventTarget {
    constructor() {
        super();
        this.chat = new FakeElement('div');
        this.chat.setAttribute('id', 'chat');
        this.setting = new FakeElement('input');
    }

    createElement(tagName) {
        return new FakeElement(tagName);
    }

    getElementById(id) {
        return id === 'allow_card_scripts' ? this.setting : null;
    }

    querySelector(selector) {
        if (selector === '#chat') {
            return this.chat;
        }

        const chatMessageMatch = selector.match(/^#chat \.mes\[mesid="(\d+)"\]$/);
        if (chatMessageMatch) {
            return this.findMessage(chatMessageMatch[1]);
        }

        const messageMatch = selector.match(/^\.mes\[mesid="(\d+)"\]$/);
        if (messageMatch) {
            return this.findMessage(messageMatch[1]);
        }

        return null;
    }

    querySelectorAll(selector) {
        if (selector === '.mes_run_card_scripts') {
            return this.chat.querySelectorAll(selector);
        }

        return [];
    }

    findMessage(messageId) {
        return this.chat.children.find(child => child.getAttribute('mesid') === String(messageId)) ?? null;
    }
}

class FakeMutationObserver {
    static instances = [];

    constructor(callback) {
        this.callback = callback;
        this.disconnected = false;
        this.observed = null;
        FakeMutationObserver.instances.push(this);
    }

    observe(target, options) {
        this.observed = { target, options };
    }

    disconnect() {
        this.disconnected = true;
    }
}

function createMessage(documentRef, messageId = 7) {
    const message = new FakeElement('div', ['mes']);
    message.setAttribute('mesid', String(messageId));

    const button = new FakeElement('div', ['mes_button', 'mes_run_card_scripts', 'fa-solid', 'fa-play']);
    button.style.display = 'none';

    const marker = new FakeElement('custom-card-script-marker');
    marker.dataset.msgId = String(messageId);

    message.appendChild(button);
    message.appendChild(marker);
    documentRef.chat.appendChild(message);

    return { message, button, marker };
}

function setupRuntime({
    enabled = true,
    snapshotHtml = '<script>triggerSlash("/echo hello")</script>',
    messageId = 7,
    limiter = null,
} = {}) {
    const documentRef = new FakeDocument();
    const windowRef = new EventTarget();
    windowRef.setTimeout = callback => callback();
    const { message, button } = createMessage(documentRef, messageId);
    const executeSlashCommandsWithOptions = jest.fn(async () => ({ pipe: 'not returned' }));
    const buildSandboxDocument = jest.fn(({ html, messageId: sandboxMessageId, nonce }) => `sandbox:${sandboxMessageId}:${nonce}:${html}`);
    const rateLimiter = limiter ?? {
        tryAcquire: jest.fn(() => ({ ok: true })),
        reset: jest.fn(),
        dispose: jest.fn(),
    };

    configureCardScriptRuntime({
        getDocument: () => documentRef,
        getWindow: () => windowRef,
        getMutationObserver: () => FakeMutationObserver,
        getLocalStorage: () => ({
            getItem: jest.fn(() => 'true'),
            setItem: jest.fn(),
        }),
        getPowerUser: () => ({ allow_card_scripts: enabled }),
        getCardScriptSnapshot: id => id === messageId && snapshotHtml ? { html: snapshotHtml, hash: 'hash' } : null,
        buildSandboxDocument,
        createRateLimiter: () => rateLimiter,
        createNonce: () => 'nonce-7',
        now: () => 1234,
        executeSlashCommandsWithOptions,
        showConfirmation: jest.fn(async () => true),
        toastr: () => ({ warning: jest.fn() }),
    });

    return { documentRef, windowRef, message, button, executeSlashCommandsWithOptions, buildSandboxDocument, rateLimiter };
}

function createSlashMessage(overrides = {}) {
    return {
        type: MESSAGE_TYPE,
        version: MESSAGE_VERSION,
        messageId: 7,
        nonce: 'nonce-7',
        command: '/echo hello',
        ...overrides,
    };
}

beforeEach(() => {
    FakeMutationObserver.instances = [];
    globalThis.localStorage = {
        getItem: jest.fn(() => 'false'),
        setItem: jest.fn(),
    };
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    resetCardScriptRuntimeForTests();
    delete globalThis.localStorage;
    jest.restoreAllMocks();
});

describe('card script runtime bridge', () => {
    test('creates a sandbox with a valid message id', async () => {
        const { message, button, buildSandboxDocument } = setupRuntime();

        const sandbox = await createSandbox(7);

        expect(getActiveSandboxCount()).toBe(1);
        expect(sandbox.messageId).toBe(7);
        expect(sandbox.nonce).toBe('nonce-7');
        expect(sandbox.createdAt).toBe(1234);
        const sandboxAttribute = sandbox.iframeElement.attributes.get('sandbox');
        expect(sandboxAttribute).toBe('allow-scripts');
        expect(sandbox.iframeElement.srcdoc).toContain('sandbox:7:nonce-7');
        expect(message.children).toContain(sandbox.iframeElement);
        expect(buildSandboxDocument).toHaveBeenCalledWith({
            html: '<script>triggerSlash("/echo hello")</script>',
            messageId: 7,
            nonce: 'nonce-7',
        });
        expect(button.style.display).toBe('');
        expect(button.classList.contains('script-running')).toBe(true);
    });

    test('accepts a valid postMessage from the registered iframe and executes the command', async () => {
        const { executeSlashCommandsWithOptions } = setupRuntime();
        const sandbox = await createSandbox(7);

        const result = await handleSandboxMessage({
            source: sandbox.iframeWindow,
            data: createSlashMessage(),
        });

        expect(result).toEqual({ ok: true });
        expect(executeSlashCommandsWithOptions).toHaveBeenCalledWith('/echo hello', {
            handleParserErrors: false,
            handleExecutionErrors: true,
            source: 'card-script-sandbox:7',
        });
        expect(sandbox.iframeWindow.postMessage).not.toHaveBeenCalled();
    });

    test('rejects postMessage events from unknown sources', async () => {
        const { executeSlashCommandsWithOptions } = setupRuntime();
        await createSandbox(7);

        const result = await handleSandboxMessage({
            source: {},
            data: createSlashMessage(),
        });

        expect(result).toEqual({ ok: false, reason: 'unknown_source' });
        expect(executeSlashCommandsWithOptions).not.toHaveBeenCalled();
    });

    test('rejects wrong nonce and wrong message id', async () => {
        const { executeSlashCommandsWithOptions } = setupRuntime();
        const sandbox = await createSandbox(7);

        await expect(handleSandboxMessage({
            source: sandbox.iframeWindow,
            data: createSlashMessage({ nonce: 'wrong' }),
        })).resolves.toEqual({ ok: false, reason: 'bad_nonce' });

        await expect(handleSandboxMessage({
            source: sandbox.iframeWindow,
            data: createSlashMessage({ messageId: 8 }),
        })).resolves.toEqual({ ok: false, reason: 'bad_message_id' });

        expect(executeSlashCommandsWithOptions).not.toHaveBeenCalled();
    });

    test('rejects disallowed and oversized commands', async () => {
        const { executeSlashCommandsWithOptions } = setupRuntime();
        const sandbox = await createSandbox(7);

        await expect(handleSandboxMessage({
            source: sandbox.iframeWindow,
            data: createSlashMessage({ command: '/send hello' }),
        })).resolves.toEqual({ ok: false, reason: 'command_not_allowed' });

        await expect(handleSandboxMessage({
            source: sandbox.iframeWindow,
            data: createSlashMessage({ command: 'x'.repeat(2001) }),
        })).resolves.toEqual({ ok: false, reason: 'command_too_long' });

        expect(executeSlashCommandsWithOptions).not.toHaveBeenCalled();
    });

    test('rate-limits repeated sandbox command requests', async () => {
        const limiter = {
            tryAcquire: jest.fn()
                .mockReturnValueOnce({ ok: true })
                .mockReturnValueOnce({ ok: false, reason: 'rate_limited' }),
            dispose: jest.fn(),
        };
        const { executeSlashCommandsWithOptions } = setupRuntime({ limiter });
        const sandbox = await createSandbox(7);

        await expect(handleSandboxMessage({
            source: sandbox.iframeWindow,
            data: createSlashMessage(),
        })).resolves.toEqual({ ok: true });
        await expect(handleSandboxMessage({
            source: sandbox.iframeWindow,
            data: createSlashMessage(),
        })).resolves.toEqual({ ok: false, reason: 'rate_limited' });

        expect(executeSlashCommandsWithOptions).toHaveBeenCalledTimes(1);
    });

    test('executes allowed commands through the slash-command API but requires an active sandbox', async () => {
        const { executeSlashCommandsWithOptions } = setupRuntime();

        await expect(executeSandboxCommand('/echo hello', 7)).resolves.toEqual({
            ok: false,
            reason: 'sandbox_not_found',
        });

        await createSandbox(7);
        await expect(executeSandboxCommand('/echo hello', 7)).resolves.toEqual({ ok: true });
        await expect(executeSandboxCommand('/delchat', 7)).resolves.toEqual({
            ok: false,
            reason: 'command_not_allowed',
        });

        expect(executeSlashCommandsWithOptions).toHaveBeenCalledTimes(1);
    });

    test('destroys a sandbox and cleans up owned resources', async () => {
        const { message, button, rateLimiter } = setupRuntime();
        const sandbox = await createSandbox(7);
        const observer = sandbox.observer;

        expect(destroySandbox(7)).toBe(true);

        expect(getActiveSandboxCount()).toBe(0);
        expect(rateLimiter.dispose).toHaveBeenCalledTimes(1);
        expect(observer.disconnected).toBe(true);
        expect(sandbox.iframeElement).toBeNull();
        expect(message.children.some(child => child.tagName === 'IFRAME')).toBe(false);
        await Promise.resolve();
        expect(button.classList.contains('script-running')).toBe(false);
    });

    test('destroys active sandboxes on chat change lifecycle events', async () => {
        setupRuntime();
        initCardScriptRuntime();
        await createSandbox(7);

        await eventSource.emit(event_types.CHAT_CHANGED);

        expect(getActiveSandboxCount()).toBe(0);
    });

    test('destroys a sandbox when the owning message leaves the DOM', async () => {
        const { message, rateLimiter } = setupRuntime();
        await createSandbox(7);
        const observer = FakeMutationObserver.instances[0];

        observer.callback([{ removedNodes: [message] }]);

        expect(getActiveSandboxCount()).toBe(0);
        expect(rateLimiter.dispose).toHaveBeenCalledTimes(1);
        expect(observer.disconnected).toBe(true);
    });

    test('hides the run button when the global setting is disabled', async () => {
        const { button } = setupRuntime({ enabled: false });

        const visible = await syncCardScriptButtonForMessage(7);

        expect(visible).toBe(false);
        expect(button.style.display).toBe('none');
        await expect(createSandbox(7)).rejects.toMatchObject({ reason: 'policy_disabled' });
    });
});
