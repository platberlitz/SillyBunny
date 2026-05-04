import ipaddr from 'ipaddr.js';
import ipMatching from 'ip-matching';
import { RateLimiterRes } from 'rate-limiter-flexible';
import { getConfigValue } from './util.js';

/**
 * Gets the IP address of the client from the request object.
 * @param {import('express').Request} req Request object
 * @returns {string} IP address of the client
 */
export function getIpFromRequest(req) {
    let clientIp = req.socket.remoteAddress;
    if (!clientIp) {
        return 'unknown';
    }
    let ip = ipaddr.parse(clientIp);
    // Check if the IP address is IPv4-mapped IPv6 address
    if (ip.kind() === 'ipv6' && ip instanceof ipaddr.IPv6 && ip.isIPv4MappedAddress()) {
        const ipv4 = ip.toIPv4Address().toString();
        clientIp = ipv4;
    } else {
        clientIp = ip.toString();
    }
    return clientIp;
}

/**
 * Get the client IP address from configured reverse proxy headers.
 * @param {import('express').Request} req Express request object
 * @returns {string|undefined} The forwarded client IP address
 */
export function getRealOrForwardedIp(req) {
    const xRealIpEnabled = !!getConfigValue('forwardedHeaders.xRealIp', true, 'boolean');
    const cfConnectingIpEnabled = !!getConfigValue('forwardedHeaders.cfConnectingIp', false, 'boolean');
    const xForwardedForEnabled = !!getConfigValue('forwardedHeaders.xForwardedFor', true, 'boolean');

    if (req.headers['x-real-ip'] && xRealIpEnabled) {
        return req.headers['x-real-ip'].toString();
    }

    if (req.headers['cf-connecting-ip'] && cfConnectingIpEnabled) {
        return req.headers['cf-connecting-ip'].toString();
    }

    if (req.headers['x-forwarded-for'] && xForwardedForEnabled) {
        const ipList = req.headers['x-forwarded-for'].toString().split(',').map(ip => ip.trim());
        return ipList[0];
    }

    return undefined;
}

/**
 * Gets the IP address of the client when behind reverse proxy using configured forwarded headers.
 * @param {import('express').Request} req Request object
 * @returns {string} IP address of the client
 */
export function getRealIpFromHeader(req) {
    return getRealOrForwardedIp(req) || getIpFromRequest(req);
}

/**
 * Gets the IP address of the client, optionally including the real/forwarded IP from headers.
 * @param {import('express').Request} request Request object
 * @param {boolean} includeHeaderIp Whether to include the real/forwarded IP from headers
 * @returns {string} IP address of the client
 */
export function getIpAddress(request, includeHeaderIp) {
    const socketIp = getIpFromRequest(request);
    const forwardedIp = includeHeaderIp && getRealOrForwardedIp(request);
    return forwardedIp ? `${socketIp} (forwarded: ${forwardedIp})` : socketIp;
}

/**
 * Filters and validates IP patterns.
 * @param {string[]} entries The list of IP patterns to validate
 * @param {(entry: string, message: string) => string} formatLog Function to format the warning message
 * @returns {string[]} The list of valid IP patterns
 */
export function filterValidIpPatterns(entries, formatLog) {
    const validEntries = [];

    if (!Array.isArray(entries)) {
        return validEntries;
    }

    for (const entry of entries) {
        try {
            ipMatching.getMatch(entry);
            validEntries.push(entry);
        } catch (e) {
            if (typeof formatLog === 'function') {
                console.warn(formatLog(entry, e?.message || 'Unknown error'));
            }
        }
    }

    return validEntries;
}

/**
 * Sets the Retry-After header on the response based on rate limit information.
 * @param {import('express').Response} response Express response object
 * @param {RateLimiterRes} rateLimit Rate limit information
 * @returns {import('express').Response} Response object
 */
export function retryAfter(response, rateLimit) {
    if (response.headersSent || !(rateLimit instanceof RateLimiterRes)) {
        return response;
    }

    const retryAfter = Math.ceil(rateLimit.msBeforeNext / 1000);
    response.set('Retry-After', retryAfter.toString());
    return response;
}

/**
 * Checks if the request is coming from a Firefox browser.
 * @param {import('express').Request} req Request object
 * @returns {boolean} True if the request is from Firefox, false otherwise.
 */
export function isFirefox(req) {
    const userAgent = req.headers['user-agent'] || '';
    return /firefox/i.test(userAgent);
}
