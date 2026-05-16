const CARD_SCRIPT_TAG_PATTERN = /<\s*(?:script|iframe)(?:\s|>)/i;

export const CARD_SCRIPT_MARKER_TAG = 'custom-card-script-marker';
export const MAX_STASHED_CARD_SCRIPTS = 200;

const cardScriptSnapshots = new Map();
const shownCardScriptToastKeys = new Set();

function normalizeMessageId(messageId) {
    const normalized = Number(messageId);
    return Number.isInteger(normalized) && normalized >= 0 ? normalized : null;
}

export function containsEmbeddedCardScript(html) {
    return CARD_SCRIPT_TAG_PATTERN.test(String(html ?? ''));
}

export function hashCardScriptHtml(html) {
    const value = String(html ?? '');
    let hash = 2166136261;

    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
}

export function rememberCardScript(messageId, html) {
    const normalizedMessageId = normalizeMessageId(messageId);
    const htmlString = String(html ?? '');

    if (normalizedMessageId === null || !containsEmbeddedCardScript(htmlString)) {
        return null;
    }

    const hash = hashCardScriptHtml(htmlString);
    const existingSnapshot = cardScriptSnapshots.get(normalizedMessageId);

    if (existingSnapshot?.hash === hash && existingSnapshot.html === htmlString) {
        cardScriptSnapshots.delete(normalizedMessageId);
        cardScriptSnapshots.set(normalizedMessageId, existingSnapshot);
        return existingSnapshot;
    }

    const snapshot = { html: htmlString, hash };
    cardScriptSnapshots.delete(normalizedMessageId);
    cardScriptSnapshots.set(normalizedMessageId, snapshot);

    while (cardScriptSnapshots.size > MAX_STASHED_CARD_SCRIPTS) {
        const oldestKey = cardScriptSnapshots.keys().next().value;
        cardScriptSnapshots.delete(oldestKey);
    }

    return snapshot;
}

export function markCardScriptHtml(html, messageId, originalHtml = html) {
    const htmlString = String(html ?? '');
    const sourceHtml = containsEmbeddedCardScript(originalHtml) ? originalHtml : htmlString;
    const snapshot = rememberCardScript(messageId, sourceHtml);

    if (!snapshot) {
        return htmlString;
    }

    return `${htmlString}<${CARD_SCRIPT_MARKER_TAG} data-msg-id="${Number(messageId)}"></${CARD_SCRIPT_MARKER_TAG}>`;
}

export function getCardScriptSnapshot(messageId) {
    const normalizedMessageId = normalizeMessageId(messageId);
    return normalizedMessageId === null ? null : cardScriptSnapshots.get(normalizedMessageId) ?? null;
}

export function buildCardScriptToastKey(chatId, messageId, hash) {
    return `${chatId ?? ''}:${messageId}:${hash}`;
}

export function hasCardScriptToastBeenShown(toastKey) {
    return shownCardScriptToastKeys.has(toastKey);
}

export function markCardScriptToastShown(toastKey) {
    shownCardScriptToastKeys.add(toastKey);
}

export function getStoredCardScriptCount() {
    return cardScriptSnapshots.size;
}

export function getShownCardScriptToastCount() {
    return shownCardScriptToastKeys.size;
}

export function forgetAllCardScripts() {
    cardScriptSnapshots.clear();
    shownCardScriptToastKeys.clear();
}
