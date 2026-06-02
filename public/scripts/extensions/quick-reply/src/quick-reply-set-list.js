export function getQuickReplySetNameKey(set) {
    const name = typeof set === 'string' ? set : set?.name;
    return String(name ?? '').trim().toLowerCase();
}

export function getUniqueQuickReplySetsByName(sets) {
    const seen = new Set();

    return (Array.isArray(sets) ? sets : []).filter(set => {
        const key = getQuickReplySetNameKey(set);

        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

export function getQuickReplySetLinkNameKey(link) {
    return getQuickReplySetNameKey(link?.set);
}

export function getUniqueQuickReplySetLinksBySetName(links) {
    const seen = new Set();

    return (Array.isArray(links) ? links : []).filter(link => {
        const key = getQuickReplySetLinkNameKey(link);

        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

export function removeQuickReplySetLinksByName(links, setOrName) {
    const deletedKey = getQuickReplySetNameKey(setOrName);

    if (!Array.isArray(links) || !deletedKey) {
        return Array.isArray(links) ? links : [];
    }

    return links.filter(link => getQuickReplySetLinkNameKey(link) !== deletedKey);
}
