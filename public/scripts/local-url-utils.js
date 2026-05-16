const LOCAL_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
]);

const PRIVATE_IPV4_PATTERNS = [
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[0-1])\./,
];

const FALLBACK_LOCAL_URL_PATTERN = /(^|[^\w:])(?:localhost|\[::1\]|::1|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)([^\w.]|$)/i;

function normalizeUrlHostname(hostname) {
    const host = String(hostname ?? '').trim().toLowerCase();

    if (host.startsWith('[') && host.endsWith(']')) {
        return host.slice(1, -1);
    }

    return host;
}

function isPrivateIpv4Hostname(hostname) {
    return PRIVATE_IPV4_PATTERNS.some(pattern => pattern.test(hostname));
}

/**
 * Checks whether an API server URL points at a likely local backend.
 * @param {string} serverUrl API server URL
 * @param {string} [baseUrl] Optional base URL for resolving browser-relative URLs
 * @returns {boolean} True if the URL points at a likely local backend
 */
export function isLikelyLocalServerUrl(serverUrl, baseUrl = undefined) {
    if (typeof serverUrl !== 'string' || !serverUrl.trim()) {
        return false;
    }

    try {
        const url = baseUrl === undefined ? new URL(serverUrl) : new URL(serverUrl, baseUrl);
        const host = normalizeUrlHostname(url.hostname);

        return LOCAL_HOSTNAMES.has(host) || host.endsWith('.local') || isPrivateIpv4Hostname(host);
    } catch {
        return FALLBACK_LOCAL_URL_PATTERN.test(serverUrl);
    }
}
