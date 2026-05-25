'use strict';

/**
 * Flattens a rendered prompt message or message collection into message-like items.
 *
 * @param {object|null|undefined} item Rendered message or message collection.
 * @returns {object[]} Rendered message-like items.
 */
function flattenRenderedMessages(item) {
    if (!item) {
        return [];
    }

    if (typeof item.flatten === 'function') {
        return item.flatten();
    }

    if (typeof item.getCollection === 'function') {
        return item.getCollection().flatMap(flattenRenderedMessages);
    }

    return [item];
}

/**
 * Gets the latest rendered content for a marker prompt from a chat completion message tree.
 * Marker prompt definitions usually have empty content; the resolved runtime content lives in
 * the generated MessageCollection keyed by marker identifier.
 *
 * @param {string} identifier Prompt identifier, e.g. worldInfoBefore.
 * @param {object|null|undefined} messages Root message collection.
 * @returns {{ role: string, content: string }} Rendered marker role and content.
 */
export function getRenderedMarkerPrompt(identifier, messages) {
    const renderedItem = messages?.getItemByIdentifier?.(identifier);
    const renderedMessages = flattenRenderedMessages(renderedItem)
        .filter(message => typeof message?.content === 'string' && message.content.length > 0);

    return {
        role: renderedMessages[0]?.role || 'system',
        content: renderedMessages.map(message => message.content).join('\n\n'),
    };
}
