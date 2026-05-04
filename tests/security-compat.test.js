import { describe, test, expect, jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function withConfigEnv(values) {
    const previous = {};
    for (const [key, value] of Object.entries(values)) {
        previous[key] = process.env[key];
        process.env[key] = value;
    }

    return () => {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    };
}

function makeRequest(headers = {}, remoteAddress = '::ffff:127.0.0.1') {
    const normalized = Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );
    return {
        headers: normalized,
        socket: { remoteAddress },
    };
}

describe('forwarded header helpers', () => {
    test('uses only configured forwarded headers', async () => {
        const restore = withConfigEnv({
            SILLYTAVERN_FORWARDEDHEADERS_XREALIP: 'false',
            SILLYTAVERN_FORWARDEDHEADERS_CFCONNECTINGIP: 'true',
            SILLYTAVERN_FORWARDEDHEADERS_XFORWARDEDFOR: 'true',
        });
        jest.resetModules();

        try {
            const { getRealOrForwardedIp, getIpAddress } = await import('../src/express-common.js');
            const request = makeRequest({
                'x-real-ip': '198.51.100.10',
                'cf-connecting-ip': '203.0.113.20',
                'x-forwarded-for': '192.0.2.30, 192.0.2.31',
            });

            expect(getRealOrForwardedIp(request)).toBe('203.0.113.20');
            expect(getIpAddress(request, true)).toBe('127.0.0.1 (forwarded: 203.0.113.20)');
            expect(getIpAddress(request, false)).toBe('127.0.0.1');
        } finally {
            restore();
        }
    });

    test('falls through to X-Forwarded-For when higher priority headers are disabled or absent', async () => {
        const restore = withConfigEnv({
            SILLYTAVERN_FORWARDEDHEADERS_XREALIP: 'false',
            SILLYTAVERN_FORWARDEDHEADERS_CFCONNECTINGIP: 'false',
            SILLYTAVERN_FORWARDEDHEADERS_XFORWARDEDFOR: 'true',
        });
        jest.resetModules();

        try {
            const { getRealOrForwardedIp } = await import('../src/express-common.js');
            expect(getRealOrForwardedIp(makeRequest({
                'x-real-ip': '198.51.100.10',
                'x-forwarded-for': '192.0.2.30, 192.0.2.31',
            }))).toBe('192.0.2.30');
        } finally {
            restore();
        }
    });
});

describe('rate-limit response helpers', () => {
    test('sets Retry-After in seconds', async () => {
        const [{ retryAfter }, { RateLimiterRes }] = await Promise.all([
            import('../src/express-common.js'),
            import('rate-limiter-flexible'),
        ]);
        const response = {
            headersSent: false,
            headers: {},
            set(name, value) {
                this.headers[name] = value;
                return this;
            },
        };

        expect(retryAfter(response, new RateLimiterRes(0, 2500, 3))).toBe(response);
        expect(response.headers['Retry-After']).toBe('3');
    });
});

describe('command-line keep-alive config', () => {
    test('parses enableKeepAlive from environment-backed config', async () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sillybunny-security-'));
        const configPath = path.join(tempRoot, 'config.yaml');
        const restore = withConfigEnv({
            SILLYTAVERN_ENABLEKEEPALIVE: 'true',
        });
        jest.resetModules();

        try {
            const { CommandLineParser } = await import('../src/command-line.js');
            const parser = new CommandLineParser();
            const parsed = parser.parse(['node', 'server.js', '--configPath', configPath]);

            expect(parsed.enableKeepAlive).toBe(true);
        } finally {
            restore();
            fs.rmSync(tempRoot, { recursive: true, force: true });
        }
    });
});

describe('private request filter', () => {
    test('blocks private addresses outside the allowlist', async () => {
        const { PrivateRequestAgent } = await import('../src/private-request-filter.js');
        const agent = new PrivateRequestAgent({
            privateAddressWhitelist: [],
            logBlocked: false,
            logAllowed: false,
            allowUnresolvedHosts: false,
            enableKeepAlive: true,
        });

        await expect(agent.connect({}, {
            host: '127.0.0.1',
            secureEndpoint: false,
            port: 80,
        })).rejects.toThrow('Blocked request to private IP address: 127.0.0.1');
        expect(agent.options.keepAlive).toBe(true);
    });

    test('allows allowlisted private addresses', async () => {
        const { PrivateRequestAgent } = await import('../src/private-request-filter.js');
        const agent = new PrivateRequestAgent({
            privateAddressWhitelist: ['127.0.0.0/8'],
            logBlocked: false,
            logAllowed: false,
            allowUnresolvedHosts: false,
            enableKeepAlive: false,
        });

        const socket = await agent.connect({}, {
            host: '127.0.0.1',
            secureEndpoint: false,
            port: 80,
        });
        socket.on('error', () => {});
        socket.destroy();

        expect(socket).toBeTruthy();
    });
});
