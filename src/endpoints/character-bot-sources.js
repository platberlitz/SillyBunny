// SillyBunny: Character Bot Sources
// Server-side search/listing aggregator for online character-card sources.
// Card import is handled by the existing `/api/content/importURL` endpoint.
import express from 'express';

export const router = express.Router();

const CHUB_PAGE_SIZE = 24;
const DEFAULT_TIMEOUT_MS = 15000;
const USER_AGENT = 'SillyBunny/CharacterBotSources';

const SOURCES = Object.freeze({
    chub: {
        id: 'chub',
        label: 'Chub.ai / Venus',
        searchable: true,
        urlHint: 'https://chub.ai/characters/<author>/<slug>',
        helper: 'Search Chub/Venus directly, then import through SillyBunny.',
    },
    aicc: {
        id: 'aicc',
        label: 'AICharacterCards.com',
        searchable: false,
        urlHint: 'https://aicharactercards.com/charactercards/<category>/<author>/<card>/',
        helper: 'Paste a card page URL. Public search is not exposed by this source.',
    },
    janitorai: {
        id: 'janitorai',
        label: 'JanitorAI',
        searchable: false,
        urlHint: 'https://janitorai.com/characters/<uuid>_character-name',
        helper: 'Paste a JanitorAI character URL.',
    },
    janny: {
        id: 'janny',
        label: 'JannyAI',
        searchable: false,
        urlHint: 'https://jannyai.com/bots/<uuid>',
        helper: 'Paste a JannyAI bot URL.',
    },
    risurealm: {
        id: 'risurealm',
        label: 'RisuRealm',
        searchable: false,
        urlHint: 'https://realm.risuai.net/character/<id>',
        helper: 'Paste a RisuRealm character URL.',
    },
    pygmalion: {
        id: 'pygmalion',
        label: 'Pygmalion',
        searchable: false,
        urlHint: 'https://pygmalion.chat/character/<uuid>',
        helper: 'Paste a Pygmalion character URL.',
    },
    direct: {
        id: 'direct',
        label: 'Direct PNG/JSON URL',
        searchable: false,
        urlHint: 'Any public PNG/JSON character card URL',
        helper: 'Paste a direct card URL from an allowed import host.',
    },
});

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response|null>}
 */
async function safeFetch(url, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            ...init,
            signal: controller.signal,
            headers: {
                'User-Agent': USER_AGENT,
                ...(init.headers || {}),
            },
        });

        if (!response.ok) {
            console.warn(`[CharBotSources] ${url} -> HTTP ${response.status}`);
            return null;
        }

        return response;
    } catch (error) {
        console.warn(`[CharBotSources] ${url} failed:`, error?.message || error);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * @param {unknown[]} values
 * @returns {string[]}
 */
function normaliseTags(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .map(value => typeof value === 'string' ? value : value?.title || value?.name || '')
        .map(value => String(value).trim())
        .filter(Boolean)
        .slice(0, 20);
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function toFiniteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

/**
 * @param {object} fields
 * @returns {object}
 */
function normalise(fields) {
    return {
        id: String(fields.id ?? ''),
        source: String(fields.source ?? ''),
        name: String(fields.name ?? 'Unknown'),
        author: fields.author ? String(fields.author) : '',
        description: fields.description ? String(fields.description).slice(0, 600) : '',
        thumbnailUrl: fields.thumbnailUrl ? String(fields.thumbnailUrl) : '',
        pageUrl: fields.pageUrl ? String(fields.pageUrl) : '',
        importUrl: String(fields.importUrl ?? ''),
        tags: normaliseTags(fields.tags),
        nsfw: Boolean(fields.nsfw),
        downloads: toFiniteNumber(fields.downloads),
        stars: toFiniteNumber(fields.stars),
    };
}

/**
 * @param {object} json
 * @param {number} page
 * @returns {{results: object[], total: number, hasMore: boolean}}
 */
function mapChubSearchResponse(json, page) {
    const data = json?.data || {};
    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    const results = nodes.map(node => {
        const fullPath = String(node.fullPath || '').trim();
        const pageUrl = fullPath ? `https://chub.ai/characters/${fullPath}` : '';
        const downloads = toFiniteNumber(node.nChats) ?? toFiniteNumber(node.downloadCount) ?? toFiniteNumber(node.nMessages);

        return normalise({
            id: node.id ?? fullPath,
            source: 'chub',
            name: node.name || node.projectName || 'Unknown',
            author: node.creatorName || (fullPath.includes('/') ? fullPath.split('/')[0] : ''),
            description: node.tagline || node.description || '',
            thumbnailUrl: node.avatar_url || node.max_res_url || '',
            pageUrl,
            importUrl: pageUrl,
            tags: node.topics || node.tags || [],
            nsfw: Boolean(node.nsfw_image || node.nsfw_only),
            downloads,
            stars: toFiniteNumber(node.starCount),
        });
    });

    const total = Number.isFinite(Number(data.count)) ? Number(data.count) : results.length;
    return {
        results,
        total,
        hasMore: Number.isFinite(Number(data.count)) ? page * CHUB_PAGE_SIZE < total : results.length >= CHUB_PAGE_SIZE,
    };
}

/**
 * @param {{ query: string, page: number, nsfw: boolean, tags: string[] }} params
 */
async function searchChub({ query, page, nsfw, tags }) {
    const params = new URLSearchParams({
        first: String(CHUB_PAGE_SIZE),
        page: String(Math.max(1, page)),
        search: query || '',
        nsfw: nsfw ? 'true' : 'false',
        nsfl: 'false',
        nsfw_only: 'false',
        asc: 'false',
        sort: 'download_count',
        count: 'true',
    });

    if (tags.length) {
        params.set('tags', tags.join(','));
    }

    const response = await safeFetch(`https://api.chub.ai/search?${params.toString()}`);
    if (!response) {
        return { results: [], total: 0, hasMore: false };
    }

    try {
        return mapChubSearchResponse(await response.json(), Math.max(1, page));
    } catch {
        return { results: [], total: 0, hasMore: false };
    }
}

/**
 * @param {string} query
 */
function searchDirect(query) {
    const trimmed = String(query || '').trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        return { results: [], total: 0, hasMore: false };
    }

    let host = '';
    try {
        host = new URL(trimmed).host;
    } catch {
        return { results: [], total: 0, hasMore: false };
    }

    return {
        results: [normalise({
            id: trimmed,
            source: 'direct',
            name: `Import from ${host}`,
            description: trimmed,
            importUrl: trimmed,
            pageUrl: trimmed,
        })],
        total: 1,
        hasMore: false,
    };
}

router.get('/list', (_request, response) => {
    response.json({ sources: Object.values(SOURCES) });
});

router.post('/search', async (request, response) => {
    const body = request.body || {};
    const sourceId = String(body.source || 'chub').toLowerCase();
    const source = SOURCES[sourceId];

    if (!source) {
        return response.status(400).json({ error: `Unknown source: ${sourceId}` });
    }

    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const page = Math.max(1, Number(body.page) || 1);
    const nsfw = Boolean(body.nsfw);
    const tags = Array.isArray(body.tags)
        ? body.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 20)
        : [];

    try {
        const payload = sourceId === 'chub'
            ? await searchChub({ query, page, nsfw, tags })
            : searchDirect(query);

        return response.json({
            source: sourceId,
            searchable: source.searchable,
            ...payload,
        });
    } catch (error) {
        console.error('[CharBotSources] search failed', error);
        return response.status(500).json({ error: 'Search failed' });
    }
});

export const __test = {
    SOURCES,
    normalise,
    mapChubSearchResponse,
    searchDirect,
};
