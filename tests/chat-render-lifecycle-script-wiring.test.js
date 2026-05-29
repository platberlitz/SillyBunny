import { describe, expect, test } from '@jest/globals';
import { parse } from 'acorn';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptSource = readFileSync(path.join(repoRoot, 'public', 'script.js'), 'utf8');
const scriptAst = parse(scriptSource, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ranges: true,
});

function visit(node, callback) {
    if (!node || typeof node !== 'object') {
        return;
    }

    if (typeof node.type === 'string') {
        callback(node);
    }

    for (const value of Object.values(node)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                visit(item, callback);
            }
        } else if (value && typeof value.type === 'string') {
            visit(value, callback);
        }
    }
}

function findNode(node, predicate) {
    let found = null;
    visit(node, current => {
        if (!found && predicate(current)) {
            found = current;
        }
    });
    return found;
}

function findExportedFunction(name) {
    return scriptAst.body
        .find(node => node.type === 'ExportNamedDeclaration'
            && node.declaration?.type === 'FunctionDeclaration'
            && node.declaration.id?.name === name)
        ?.declaration;
}

function findFunctionDeclaration(name) {
    return scriptAst.body
        .find(node => node.type === 'FunctionDeclaration' && node.id?.name === name);
}

function findTopLevelVariable(functionNode, name) {
    for (const statement of functionNode.body.body) {
        if (statement.type !== 'VariableDeclaration') {
            continue;
        }

        const declaration = statement.declarations.find(item => item.id?.name === name);
        if (declaration) {
            return { declaration, statement };
        }
    }

    return null;
}

function getSource(node) {
    return scriptSource.slice(node.range[0], node.range[1]);
}

describe('chat render lifecycle script wiring', () => {
    test('printMessages routes initial-load bottom landing through the lifecycle gate', () => {
        const printMessages = findExportedFunction('printMessages');
        const source = getSource(printMessages);

        expect(source).toContain('scrollLoadedChatToBottomThroughLifecycle();');
        expect(source).toContain('delay(debounce_timeout.short).then(() => scrollOnMediaLoad({ force: true }));');

        const lifecycleGate = findFunctionDeclaration('scrollLoadedChatToBottomThroughLifecycle');
        expect(lifecycleGate).toBeTruthy();

        const lifecycleGateSource = getSource(lifecycleGate);
        expect(lifecycleGateSource).toContain('isChatRenderLifecycleRolloutEnabled()');
        expect(lifecycleGateSource).toContain('resolveChatScrollAction({');
        expect(lifecycleGateSource).toContain('intent: CHAT_SCROLL_INTENT.INITIAL_LOAD');
        expect(lifecycleGateSource).toContain('shouldApplyChatBottomScrollAction(action)');
        expect(lifecycleGateSource).toContain('scrollLoadedChatToBottom();');
    });

    test('redisplayChat delegates selected messages to the guarded redisplay renderer', () => {
        const redisplayChat = findExportedFunction('redisplayChat');
        const source = getSource(redisplayChat);

        expect(source).toContain('const messages = targetChat.slice(startIndex);');
        expect(source).toContain('const renderedMessageIds = await renderRedisplayChatMessages({ messages, startIndex });');
        expect(source).toContain('applyCharacterTagsToMessageDivs({ mesIds: renderedMessageIds });');
        expect(source).toContain('refreshSwipeButtons(false, fade);');
        expect(source).toContain('applyStylePins();');
        expect(source).toContain('updateEditArrowClasses();');
    });

    test('redisplayChat keeps render-batch routing behind the lifecycle rollout guard', () => {
        const renderRedisplayChatMessages = findFunctionDeclaration('renderRedisplayChatMessages');
        const source = getSource(renderRedisplayChatMessages);

        expect(source).toContain('const batchSize = getMobileChatRenderBatchSize(messages.length);');
        expect(source).toContain('if (isChatRenderLifecycleRolloutEnabled())');
        expect(source).toContain('return renderRedisplayChatMessagesThroughLifecycle({ messages, startIndex, batchSize });');
        expect(source).toContain('return renderRedisplayChatMessagesLegacy({ messages, startIndex, batchSize });');
    });

    test('guard-on redisplayChat delegates batch mechanics to the lifecycle render batch helper', () => {
        const renderRedisplayChatMessagesThroughLifecycle = findFunctionDeclaration('renderRedisplayChatMessagesThroughLifecycle');
        const source = getSource(renderRedisplayChatMessagesThroughLifecycle);

        expect(source).toContain('renderMessagesInBatches({');
        expect(source).toContain('messages,');
        expect(source).toContain('firstMessageId: startIndex');
        expect(source).toContain('batchSize,');
        expect(source).toContain('renderMessageElement: (message, messageId) => updateMessageElement(message, { messageId })');
        expect(source).toContain('insertFragment: fragment => chatElement[0].appendChild(fragment)');
        expect(source).toContain('waitForNextFrame,');
        expect(source).toContain('markLastMessage: true');
    });

    test('guard-off redisplayChat keeps legacy inline batching', () => {
        const renderRedisplayChatMessagesLegacy = findFunctionDeclaration('renderRedisplayChatMessagesLegacy');
        const source = getSource(renderRedisplayChatMessagesLegacy);

        expect(source).not.toContain('renderMessagesInBatches');
        expect(source).toContain('const renderedMessageIds = lodash.range(startIndex, startIndex + messages.length, 1);');
        expect(source).toContain('const fragment = document.createDocumentFragment();');
        expect(source).toContain('const messageElement = updateMessageElement(message, { messageId });');
        expect(source).toContain('newMessageElements.at(-1).classList.add(\'last_mes\');');
        expect(source).toContain('chatElement[0].appendChild(fragment);');
        expect(source).toContain('await waitForNextFrame();');
        expect(source).toContain('return renderedMessageIds;');
    });

    test('showMoreMessages delegates selected history messages to the guarded show-more renderer', () => {
        const showMoreMessages = findExportedFunction('showMoreMessages');
        const source = getSource(showMoreMessages);

        expect(source).toContain('const firstId = clamp(messageId - count, 0, Infinity);');
        expect(source).toContain('const messages = chat.slice(firstId, messageId);');
        expect(source).toContain('const anchor = captureVisibleChatMessageAnchor();');
        expect(source).toContain('await renderShowMoreMessages({');
        expect(source).toContain('refreshSwipeButtons();');
        expect(source).toContain('showMoreButton.remove();');
        expect(source).toContain('applyStylePins();');
        expect(source).toContain('await settleVisibleChatMessageAnchor(anchor);');
        expect(source).toContain('await eventSource.emit(event_types.MORE_MESSAGES_LOADED);');
    });

    test('showMoreMessages keeps render-batch routing behind the lifecycle rollout guard', () => {
        const renderShowMoreMessages = findFunctionDeclaration('renderShowMoreMessages');
        const source = getSource(renderShowMoreMessages);

        expect(source).toContain('const batchSize = getMobileChatRenderBatchSize(messages.length);');
        expect(source).toContain('if (isChatRenderLifecycleRolloutEnabled())');
        expect(source).toContain('await renderShowMoreMessagesThroughLifecycle(renderOptions);');
        expect(source).toContain('await renderShowMoreMessagesLegacy(renderOptions);');
    });

    test('guard-on showMoreMessages delegates batch insertion to the lifecycle render batch helper', () => {
        const renderShowMoreMessagesThroughLifecycle = findFunctionDeclaration('renderShowMoreMessagesThroughLifecycle');
        const source = getSource(renderShowMoreMessagesThroughLifecycle);

        expect(source).toContain('renderMessagesInBatches({');
        expect(source).toContain('messages,');
        expect(source).toContain('firstMessageId: firstId');
        expect(source).toContain('batchSize,');
        expect(source).toContain('renderMessageElement: (message, messageId) => updateMessageElement(message, { messageId })');
        expect(source).toContain('insertFragment: fragment => insertShowMoreFragment(insertionReference, fragment)');
        expect(source).toContain('waitForNextFrame: async () =>');
        expect(source).toContain('await waitForNextFrame();');
        expect(source).toContain('afterBatch: restoreAnchorIfNeeded');
    });

    test('guard-off showMoreMessages keeps legacy inline batching and anchor restores', () => {
        const renderShowMoreMessagesLegacy = findFunctionDeclaration('renderShowMoreMessagesLegacy');
        const source = getSource(renderShowMoreMessagesLegacy);

        expect(source).not.toContain('renderMessagesInBatches');
        expect(source).toContain('const fragment = document.createDocumentFragment();');
        expect(source).toContain('const batch = messages.slice(offset, offset + batchSize);');
        expect(source).toContain('const messageElement = updateMessageElement(message, { messageId: firstId + offset + id });');
        expect(source).toContain('insertShowMoreFragment(insertionReference, fragment);');
        expect(source).toContain('restoreVisibleChatMessageAnchor(anchor);');
        expect(source).toContain('await waitForNextFrame();');
    });

    test('addOneMessage passes pre-mutation bottom state into lifecycle bottom scroll', () => {
        const addOneMessage = findExportedFunction('addOneMessage');
        expect(addOneMessage).toBeTruthy();

        const tailAppendState = findTopLevelVariable(addOneMessage, 'tailAppendIsNearBottom');
        expect(tailAppendState).toBeTruthy();
        expect(tailAppendState.declaration.init?.type).toBe('ConditionalExpression');
        expect(findNode(tailAppendState.declaration.init.test, node => node.type === 'Identifier' && node.name === 'isTailAppend')).toBeTruthy();
        expect(findNode(tailAppendState.declaration.init.test, node => node.type === 'Identifier' && node.name === 'scroll')).toBeTruthy();
        expect(tailAppendState.declaration.init.consequent?.callee?.name).toBe('isChatScrolledNearBottom');
        expect(tailAppendState.declaration.init.alternate?.value).toBe(true);

        const firstRenderWork = findNode(addOneMessage, node => node.type === 'CallExpression'
            && node.callee?.name === 'updateMessageElement');
        expect(firstRenderWork).toBeTruthy();
        expect(tailAppendState.statement.range[0]).toBeLessThan(firstRenderWork.range[0]);

        const bottomScrollCall = findNode(addOneMessage, node => node.type === 'CallExpression'
            && node.callee?.name === 'scrollChatToBottom');
        expect(bottomScrollCall).toBeTruthy();

        const scrollOptions = bottomScrollCall.arguments[0];
        expect(scrollOptions?.type).toBe('ObjectExpression');
        expect(scrollOptions.properties).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: expect.objectContaining({ name: 'waitForFrame' }),
                value: expect.objectContaining({ value: true }),
            }),
            expect.objectContaining({
                key: expect.objectContaining({ name: 'isNearBottom' }),
                value: expect.objectContaining({ name: 'tailAppendIsNearBottom' }),
            }),
        ]));
    });

    test('addOneMessage preserves mobile bottom pin as platform policy', () => {
        const addOneMessage = findExportedFunction('addOneMessage');
        const mobilePinBranch = findNode(addOneMessage, node => node.type === 'IfStatement'
            && node.test?.name === 'shouldPinMobileBottom');

        expect(mobilePinBranch).toBeTruthy();
        expect(findNode(mobilePinBranch.consequent, node => node.type === 'CallExpression'
            && node.callee?.name === 'pinMobileChatToBottom')).toBeTruthy();
        expect(findNode(mobilePinBranch.alternate, node => node.type === 'CallExpression'
            && node.callee?.name === 'scrollChatToBottom')).toBeTruthy();
    });

    test('addOneMessage keeps compatibility follow-up hooks in place', () => {
        const addOneMessage = findExportedFunction('addOneMessage');
        const source = getSource(addOneMessage);

        expect(source).toContain('querySelector(\'.mes.last_mes\')?.classList.remove(\'last_mes\')');
        expect(source).toContain('lastMessageElement?.classList.add(\'last_mes\')');
        expect(source).toContain('if (showSwipes) refreshSwipeButtons();');
        expect(source).toContain('applyCharacterTagsToMessageDivs({ mesIds: messageId });');
        expect(source).toContain('updateEditArrowClasses();');
    });

    test('addOneMessage keeps returning the rendered jQuery element', () => {
        const addOneMessage = findExportedFunction('addOneMessage');
        const returnStatement = addOneMessage.body.body.find(node => node.type === 'ReturnStatement');

        expect(returnStatement?.argument).toEqual(expect.objectContaining({
            type: 'Identifier',
            name: 'messageElement',
        }));
    });

    test('updateMessageBlock keeps lifecycle update routing behind the rollout guard', () => {
        const updateMessageBlock = findExportedFunction('updateMessageBlock');
        const source = getSource(updateMessageBlock);

        expect(source).toContain('if (shouldDeferMobileMessageUpdates())');
        expect(source).toContain('queueMobileMessageBlockUpdate(messageId, message, { rerenderMessage });');
        expect(source).toContain('if (isChatRenderLifecycleRolloutEnabled())');
        expect(source).toContain('updateMessageBlockThroughLifecycle(messageId, message, { rerenderMessage });');
        expect(source).toContain('applyMessageBlockUpdate(messageId, message, { rerenderMessage });');
    });

    test('guard-on updateMessageBlock delegates queue mechanics to the lifecycle update queue helper', () => {
        expect(scriptSource).toContain('createMessageUpdateQueue,');

        const getMessageUpdateQueue = findFunctionDeclaration('getMessageUpdateQueue');
        const getQueueSource = getSource(getMessageUpdateQueue);

        expect(getQueueSource).toContain('createMessageUpdateQueue({');
        expect(getQueueSource).toContain('applyUpdate: applyMessageBlockUpdate');

        const updateMessageBlockThroughLifecycle = findFunctionDeclaration('updateMessageBlockThroughLifecycle');
        const lifecycleSource = getSource(updateMessageBlockThroughLifecycle);

        expect(lifecycleSource).toContain('const queue = getMessageUpdateQueue();');
        expect(lifecycleSource).toContain('queue.queue(messageId, message, { rerenderMessage });');
        expect(lifecycleSource).toContain('queue.flush();');
    });

    test('mobile-deferred message updates use the lifecycle update queue without changing scheduling policy', () => {
        expect(scriptSource).not.toContain('pendingMobileMessageUpdates = new Map');
        expect(scriptSource).not.toContain('pendingMobileMessageUpdates.set');

        const getMobileMessageUpdateQueue = findFunctionDeclaration('getMobileMessageUpdateQueue');
        const getMobileQueueSource = getSource(getMobileMessageUpdateQueue);

        expect(getMobileQueueSource).toContain('createMessageUpdateQueue({');
        expect(getMobileQueueSource).toContain('applyUpdate: applyMessageBlockUpdate');

        const flushPendingMobileMessageUpdates = findFunctionDeclaration('flushPendingMobileMessageUpdates');
        const flushSource = getSource(flushPendingMobileMessageUpdates);

        expect(flushSource).toContain('pendingMobileMessageUpdateFrame = 0;');
        expect(flushSource).toContain('pendingMobileMessageUpdateTimer = 0;');
        expect(flushSource).toContain('getMobileMessageUpdateQueue().flush();');

        const queueMobileMessageBlockUpdate = findFunctionDeclaration('queueMobileMessageBlockUpdate');
        const queueSource = getSource(queueMobileMessageBlockUpdate);

        expect(queueSource).toContain('getMobileMessageUpdateQueue().queue(messageId, message, { rerenderMessage });');
        expect(queueSource).toContain('if (pendingMobileMessageUpdateFrame || pendingMobileMessageUpdateTimer)');
        expect(queueSource).toContain('pendingMobileMessageUpdateTimer = window.setTimeout(() =>');
        expect(queueSource).toContain('pendingMobileMessageUpdateFrame = requestAnimationFrame(flushPendingMobileMessageUpdates);');
    });
});
