import { getRequestHeaders } from '../../../script.js';
import { POPUP_TYPE, Popup } from '../../popup.js';
import { escapeHtml, importFromExternalUrl } from '../../utils.js';

const MODULE_NAME = 'character-bot-sources';
const BUTTON_ID = 'character_bot_sources_button';
const API_BASE = '/api/character-bot-sources';

let sources = [];
let activeSourceId = 'chub';
let currentPage = 1;

/**
 * @returns {Promise<void>}
 */
export async function init() {
    if (document.getElementById(BUTTON_ID)) {
        return;
    }

    const container = document.getElementById('rm_buttons_container');
    if (!container) {
        return;
    }

    const button = document.createElement('div');
    button.id = BUTTON_ID;
    button.className = 'menu_button menu_button_icon';
    button.title = 'Browse online character sources';
    button.setAttribute('aria-label', 'Browse online character sources');
    button.innerHTML = '<i class="fa-solid fa-globe"></i><span>Browse Online</span>';
    button.addEventListener('click', openBrowserPopup);
    container.append(button);
}

/**
 * @returns {Promise<void>}
 */
async function openBrowserPopup() {
    const root = createBrowserElement();
    await loadSources(root);

    await new Popup(root, POPUP_TYPE.TEXT, '', {
        okButton: 'Close',
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        allowHorizontalScrolling: false,
        onOpen: () => {
            bindBrowserEvents(root);
            renderSourcePicker(root);
            updateSourceHelp(root);
            renderEmpty(root, 'Pick a source, enter search text or paste a URL, then import.');
        },
    }).show();
}

/**
 * @returns {HTMLElement}
 */
function createBrowserElement() {
    const root = document.createElement('div');
    root.className = 'cbs-browser';
    root.innerHTML = `
        <div class="cbs-header">
            <div>
                <div class="cbs-eyebrow">Character Sources</div>
                <h2>Browse Online</h2>
                <p>Search verified sources or paste a card URL. Imports use SillyBunny's existing safe import pipeline.</p>
            </div>
        </div>
        <div class="cbs-source-row" data-cbs-sources></div>
        <form class="cbs-search" data-cbs-search-form>
            <label class="cbs-field cbs-query-field">
                <span data-cbs-query-label>Search or URL</span>
                <input class="text_pole" name="query" autocomplete="off" placeholder="Search Chub or paste a character URL">
            </label>
            <label class="cbs-field cbs-tags-field" data-cbs-tags-wrap>
                <span>Tags</span>
                <input class="text_pole" name="tags" autocomplete="off" placeholder="optional, comma separated">
            </label>
            <label class="cbs-nsfw" data-cbs-nsfw-wrap>
                <input type="checkbox" name="nsfw">
                <span>Include NSFW</span>
            </label>
            <button class="menu_button menu_button_primary" type="submit" data-cbs-submit>
                <i class="fa-solid fa-magnifying-glass"></i>
                <span>Search</span>
            </button>
        </form>
        <div class="cbs-helper" data-cbs-helper></div>
        <div class="cbs-status" data-cbs-status aria-live="polite"></div>
        <div class="cbs-results" data-cbs-results></div>
        <div class="cbs-pager" data-cbs-pager hidden>
            <button class="menu_button" type="button" data-cbs-prev>
                <i class="fa-solid fa-chevron-left"></i>
                <span>Prev</span>
            </button>
            <span data-cbs-page></span>
            <button class="menu_button" type="button" data-cbs-next>
                <span>Next</span>
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    `;
    return root;
}

/**
 * @param {HTMLElement} root
 */
async function loadSources(root) {
    if (sources.length) {
        return;
    }

    setStatus(root, 'Loading sources...');
    try {
        const response = await fetch(`${API_BASE}/list`, { headers: getRequestHeaders() });
        if (!response.ok) {
            throw new Error(response.statusText || `HTTP ${response.status}`);
        }

        const data = await response.json();
        sources = Array.isArray(data.sources) ? data.sources : [];
        if (sources.length && !sources.some(source => source.id === activeSourceId)) {
            activeSourceId = sources[0].id;
        }
        setStatus(root, '');
    } catch (error) {
        console.error(`[${MODULE_NAME}] Source list failed`, error);
        setStatus(root, 'Could not load source list. Try again after checking the server logs.', true);
    }
}

/**
 * @param {HTMLElement} root
 */
function bindBrowserEvents(root) {
    root.querySelector('[data-cbs-search-form]')?.addEventListener('submit', event => {
        event.preventDefault();
        void runSearch(root, 1);
    });

    root.querySelector('[data-cbs-prev]')?.addEventListener('click', () => {
        if (currentPage > 1) {
            void runSearch(root, currentPage - 1);
        }
    });

    root.querySelector('[data-cbs-next]')?.addEventListener('click', () => {
        void runSearch(root, currentPage + 1);
    });
}

/**
 * @param {HTMLElement} root
 */
function renderSourcePicker(root) {
    const row = root.querySelector('[data-cbs-sources]');
    if (!row) {
        return;
    }

    row.innerHTML = sources.map(source => `
        <button class="cbs-source ${source.id === activeSourceId ? 'is-active' : ''}" type="button" data-source-id="${escapeHtml(source.id)}">
            <span>${escapeHtml(source.label)}</span>
            <small>${source.searchable ? 'Search' : 'URL'}</small>
        </button>
    `).join('');

    for (const button of row.querySelectorAll('[data-source-id]')) {
        button.addEventListener('click', () => {
            activeSourceId = button.getAttribute('data-source-id') || activeSourceId;
            currentPage = 1;
            renderSourcePicker(root);
            updateSourceHelp(root);
            renderEmpty(root, getActiveSource()?.searchable ? 'Search this source to list cards.' : 'Paste a supported card URL to import.');
        });
    }
}

/**
 * @param {HTMLElement} root
 */
function updateSourceHelp(root) {
    const source = getActiveSource();
    const searchable = Boolean(source?.searchable);
    const helper = root.querySelector('[data-cbs-helper]');
    const queryLabel = root.querySelector('[data-cbs-query-label]');
    const queryInput = root.querySelector('input[name="query"]');
    const tagsWrap = root.querySelector('[data-cbs-tags-wrap]');
    const nsfwWrap = root.querySelector('[data-cbs-nsfw-wrap]');
    const submitLabel = root.querySelector('[data-cbs-submit] span');

    if (helper) {
        helper.innerHTML = `
            <strong>${escapeHtml(source?.label || 'Source')}</strong>
            <span>${escapeHtml(source?.helper || '')}</span>
            <code>${escapeHtml(source?.urlHint || '')}</code>
        `;
    }
    if (queryLabel) {
        queryLabel.textContent = searchable ? 'Search' : 'Card URL';
    }
    if (queryInput) {
        queryInput.placeholder = searchable ? 'name, creator, prompt idea' : source?.urlHint || 'https://...';
    }
    if (tagsWrap) {
        tagsWrap.hidden = !searchable;
    }
    if (nsfwWrap) {
        nsfwWrap.hidden = !searchable;
    }
    if (submitLabel) {
        submitLabel.textContent = searchable ? 'Search' : 'Check URL';
    }
}

/**
 * @param {HTMLElement} root
 * @param {number} page
 */
async function runSearch(root, page) {
    const form = root.querySelector('[data-cbs-search-form]');
    if (!(form instanceof HTMLFormElement)) {
        return;
    }

    const formData = new FormData(form);
    const query = String(formData.get('query') || '').trim();
    const tags = String(formData.get('tags') || '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

    if (!query) {
        renderEmpty(root, getActiveSource()?.searchable ? 'Enter a search term first.' : 'Paste a card URL first.');
        return;
    }

    currentPage = page;
    setBusy(root, true);
    setStatus(root, 'Searching...');
    renderEmpty(root, '');

    try {
        const response = await fetch(`${API_BASE}/search`, {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                source: activeSourceId,
                query,
                tags,
                page,
                nsfw: Boolean(formData.get('nsfw')),
            }),
        });

        if (!response.ok) {
            throw new Error(response.statusText || `HTTP ${response.status}`);
        }

        renderResults(root, await response.json());
    } catch (error) {
        console.error(`[${MODULE_NAME}] Search failed`, error);
        setStatus(root, 'Search failed. The source may be unavailable right now.', true);
        renderEmpty(root, 'No results to show.');
    } finally {
        setBusy(root, false);
    }
}

/**
 * @param {HTMLElement} root
 * @param {object} payload
 */
function renderResults(root, payload) {
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const total = Number(payload?.total) || results.length;
    const source = getActiveSource();
    setStatus(root, results.length ? `${total} result${total === 1 ? '' : 's'} from ${source?.label || 'source'}.` : 'No matching cards found.');

    if (!results.length) {
        renderEmpty(root, source?.searchable ? 'Try a broader search or fewer tags.' : 'Check that the pasted URL is public and supported.');
        renderPager(root, false);
        return;
    }

    const container = root.querySelector('[data-cbs-results]');
    if (!container) {
        return;
    }

    container.innerHTML = results.map((result, index) => renderResultCard(result, index)).join('');

    for (const button of container.querySelectorAll('[data-cbs-import]')) {
        button.addEventListener('click', async () => {
            const index = Number(button.getAttribute('data-cbs-import'));
            const result = results[index];
            if (!result?.importUrl) {
                toastr.warning('This result has no import URL.');
                return;
            }

            button.classList.add('disabled');
            button.setAttribute('aria-busy', 'true');
            try {
                await importFromExternalUrl(result.importUrl);
            } catch (error) {
                console.error(`[${MODULE_NAME}] Import failed`, error);
                toastr.error('Import failed. Check the URL and server logs.');
            } finally {
                button.classList.remove('disabled');
                button.removeAttribute('aria-busy');
            }
        });
    }

    renderPager(root, Boolean(payload?.hasMore));
}

/**
 * @param {object} result
 * @param {number} index
 * @returns {string}
 */
function renderResultCard(result, index) {
    const tags = Array.isArray(result.tags) ? result.tags.slice(0, 6) : [];
    const metrics = [];
    if (Number.isFinite(result.stars)) {
        metrics.push(`<span><i class="fa-solid fa-star"></i> ${result.stars}</span>`);
    }
    if (Number.isFinite(result.downloads)) {
        metrics.push(`<span><i class="fa-solid fa-comments"></i> ${result.downloads}</span>`);
    }
    if (result.nsfw) {
        metrics.push('<span class="cbs-nsfw-chip">NSFW</span>');
    }

    return `
        <article class="cbs-card">
            <div class="cbs-thumb" aria-hidden="true">
                ${result.thumbnailUrl ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="">` : '<i class="fa-solid fa-user-astronaut"></i>'}
            </div>
            <div class="cbs-card-main">
                <div class="cbs-card-title-row">
                    <h3>${escapeHtml(result.name || 'Unknown')}</h3>
                    ${result.pageUrl ? `<a href="${escapeHtml(result.pageUrl)}" target="_blank" rel="noopener noreferrer" title="Open source page"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
                </div>
                ${result.author ? `<div class="cbs-author">by ${escapeHtml(result.author)}</div>` : ''}
                ${result.description ? `<p>${escapeHtml(result.description)}</p>` : ''}
                ${tags.length ? `<div class="cbs-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                ${metrics.length ? `<div class="cbs-metrics">${metrics.join('')}</div>` : ''}
            </div>
            <button class="menu_button menu_button_primary cbs-import" type="button" data-cbs-import="${index}">
                <i class="fa-solid fa-cloud-arrow-down"></i>
                <span>Import</span>
            </button>
        </article>
    `;
}

/**
 * @param {HTMLElement} root
 * @param {string} message
 */
function renderEmpty(root, message) {
    const container = root.querySelector('[data-cbs-results]');
    if (container) {
        container.innerHTML = message ? `<div class="cbs-empty">${escapeHtml(message)}</div>` : '';
    }
    renderPager(root, false);
}

/**
 * @param {HTMLElement} root
 * @param {boolean} hasMore
 */
function renderPager(root, hasMore) {
    const pager = root.querySelector('[data-cbs-pager]');
    const pageLabel = root.querySelector('[data-cbs-page]');
    const prev = root.querySelector('[data-cbs-prev]');
    const next = root.querySelector('[data-cbs-next]');
    if (!pager || !pageLabel || !prev || !next) {
        return;
    }

    pager.hidden = currentPage <= 1 && !hasMore;
    pageLabel.textContent = `Page ${currentPage}`;
    prev.toggleAttribute('disabled', currentPage <= 1);
    next.toggleAttribute('disabled', !hasMore);
}

/**
 * @param {HTMLElement} root
 * @param {boolean} busy
 */
function setBusy(root, busy) {
    const submit = root.querySelector('[data-cbs-submit]');
    if (submit) {
        submit.toggleAttribute('disabled', busy);
        submit.classList.toggle('disabled', busy);
    }
}

/**
 * @param {HTMLElement} root
 * @param {string} message
 * @param {boolean} [isError]
 */
function setStatus(root, message, isError = false) {
    const status = root.querySelector('[data-cbs-status]');
    if (!status) {
        return;
    }

    status.textContent = message;
    status.classList.toggle('is-error', isError);
}

/**
 * @returns {object|null}
 */
function getActiveSource() {
    return sources.find(source => source.id === activeSourceId) || sources[0] || null;
}
