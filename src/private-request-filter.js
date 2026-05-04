import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import ipMatch from 'ip-matching';
import ipRegex from 'ip-regex';
import { Agent } from 'agent-base';
import { color } from './util.js';
import { filterValidIpPatterns } from './express-common.js';

const LOG_HEADER = '[Private Request Filter]';

/** @type {import('ip-matching').IPMatch[]} */
const privateIpRanges = [
    ipMatch.getMatch('127.0.0.0/8'),
    ipMatch.getMatch('10.0.0.0/8'),
    ipMatch.getMatch('172.16.0.0/12'),
    ipMatch.getMatch('192.168.0.0/16'),
    ipMatch.getMatch('169.254.0.0/16'),
    ipMatch.getMatch('::1/128'),
    ipMatch.getMatch('fc00::/7'),
    ipMatch.getMatch('fe80::/10'),
];

/**
 * HTTP/HTTPS agent that blocks requests resolving to private IP addresses unless explicitly allowed.
 */
export class PrivateRequestAgent extends Agent {
    /** @type {Readonly<import('ip-matching').IPMatch[]>} */
    privateAddressWhitelist = [];

    logBlocked = true;
    logAllowed = false;
    allowUnresolvedHosts = false;

    /**
     * @param {object} options Agent options
     * @param {string[]} options.privateAddressWhitelist List of private IP addresses or CIDR ranges to allow
     * @param {boolean} options.logBlocked Whether to log blocked requests
     * @param {boolean} options.logAllowed Whether to log allowed requests
     * @param {boolean} options.allowUnresolvedHosts Whether to allow unresolved hosts
     * @param {boolean} options.enableKeepAlive Whether to enable keep-alive
     */
    constructor(options = { privateAddressWhitelist: [], logBlocked: true, logAllowed: false, allowUnresolvedHosts: false, enableKeepAlive: false }) {
        super({ keepAlive: options.enableKeepAlive });

        const logEntryWarning = (entry, message) => `${color.red('Warning')}: Ignoring invalid private whitelist entry ${color.yellow(entry)} - ${message}`;
        const whitelistArray = Array.isArray(options.privateAddressWhitelist) ? options.privateAddressWhitelist : [];
        this.privateAddressWhitelist = Object.freeze(filterValidIpPatterns(whitelistArray, logEntryWarning).map(pattern => ipMatch.getMatch(pattern)));
        this.allowUnresolvedHosts = options.allowUnresolvedHosts;
        this.logBlocked = options.logBlocked;
        this.logAllowed = options.logAllowed;
    }

    /**
     * @param {string} address The IP address to check
     * @returns {boolean} Whether the IP is private
     */
    #isPrivateIp(address) {
        return privateIpRanges.some(range => range.matches(address));
    }

    /**
     * @param {string} address The IP address to check
     * @returns {boolean} Whether the private IP is allowed
     */
    #isAllowedPrivateAddress(address) {
        return this.privateAddressWhitelist.some(match => match.matches(address));
    }

    /**
     * @param {http.ClientRequest} _req HTTP request object
     * @param {import('agent-base').AgentConnectOpts} options Agent connection options
     * @returns {Promise<net.Socket|tls.TLSSocket>}
     */
    async connect(_req, options) {
        const raiseError = (message, log = true) => {
            if (log) {
                console.error(color.red(LOG_HEADER), message);
            }
            throw new Error(message);
        };

        const connect = (hostOverride = null) => {
            if (hostOverride) {
                options.host = hostOverride;
            }
            return options.secureEndpoint ? tls.connect(options) : net.connect(options);
        };

        const validateIpAddress = (ip) => {
            if (!this.#isPrivateIp(ip)) {
                return connect(ip);
            }

            if (this.#isAllowedPrivateAddress(ip)) {
                if (this.logAllowed) {
                    console.info(color.green(LOG_HEADER), 'Allowed request to private IP address:', color.blue(ip));
                }
                return connect(ip);
            }

            return raiseError(`Blocked request to private IP address: ${ip}`, this.logBlocked);
        };

        const lookupHost = async (host) => {
            try {
                return (await dns.promises.lookup(host)).address;
            } catch {
                return '';
            }
        };

        const host = options.host;
        if (!host) {
            return raiseError('No host specified in request options', true);
        }

        const isIp = ipRegex.v4({ exact: true }).test(host) || ipRegex.v6({ exact: true }).test(host);
        if (isIp) {
            return validateIpAddress(host);
        }

        const address = await lookupHost(host);
        if (!address) {
            if (this.allowUnresolvedHosts) {
                return connect();
            }
            return raiseError(`Unable to resolve host: ${host}. Set privateAddressWhitelist.allowUnresolvedHosts to true to bypass this check.`, true);
        }

        return validateIpAddress(address);
    }
}

/**
 * Initialize the private request filter by replacing global HTTP/HTTPS agents.
 * @param {object} options Initialization options
 * @param {boolean} options.listen Whether the server listens for incoming requests
 * @param {boolean} options.enabled Whether the private request filter is enabled
 * @param {string[]} options.privateAddressWhitelist Allowed private ranges
 * @param {boolean} options.logBlocked Whether blocked requests are logged
 * @param {boolean} options.logAllowed Whether allowed requests are logged
 * @param {boolean} options.allowUnresolvedHosts Whether unresolved hosts are allowed
 * @param {boolean} options.enableKeepAlive Whether keep-alive is enabled
 */
export default function initPrivateRequestFilter({ listen, enabled, privateAddressWhitelist, logBlocked, logAllowed, allowUnresolvedHosts, enableKeepAlive }) {
    if (!enabled) {
        if (listen) {
            console.warn();
            console.warn(color.yellow('Warning: listen is enabled but private request filter is disabled. This may expose your server to SSRF attacks.'));
            console.warn(color.blue('To enable, provide trusted addresses in privateAddressWhitelist.allowedRanges and set privateAddressWhitelist.enabled to true in config.yaml and restart the server.'));
        }
        return;
    }

    const agent = new PrivateRequestAgent({ privateAddressWhitelist, logBlocked, logAllowed, allowUnresolvedHosts, enableKeepAlive });
    http.globalAgent = agent;
    https.globalAgent = agent;

    console.info();
    console.info(color.green(LOG_HEADER), 'Enabled');
    if (agent.privateAddressWhitelist.length > 0) {
        console.info(color.green(LOG_HEADER), 'Allowed private addresses:', color.blue(agent.privateAddressWhitelist.join(', ')));
    }
    console.info();
}
