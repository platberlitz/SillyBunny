import { beforeAll, afterAll, describe, expect, test } from '@jest/globals';
import express from 'express';
import { fileURLToPath } from 'node:url';

import { CHAT_COMPLETION_SOURCES } from '../src/constants.js';
import { setConfigFilePath } from '../src/util.js';
import { MockServer } from './util/mock-server.js';

setConfigFilePath(fileURLToPath(new URL('../default/config.yaml', import.meta.url)));

describe('Claude sampling controls', () => {
    /** @type {import('express').Router} */
    let chatCompletionsRouter;
    /** @type {MockServer} */
    let upstream;
    /** @type {import('http').Server} */
    let appServer;

    beforeAll(async () => {
        ({ router: chatCompletionsRouter } = await import('../src/endpoints/backends/chat-completions.js'));

        upstream = new MockServer({ port: 3002, host: '127.0.0.1' });
        await upstream.start();

        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
            req.user = {
                directories: {
                    root: '/tmp/sillybunny-test-user',
                },
            };
            next();
        });
        app.use('/api/backends/chat-completions', chatCompletionsRouter);

        await new Promise((resolve) => {
            appServer = app.listen(3011, '127.0.0.1', resolve);
        });
    });

    afterAll(async () => {
        await upstream.stop();

        if (appServer) {
            await new Promise((resolve, reject) => {
                appServer.close((err) => err ? reject(err) : resolve());
            });
        }
    });

    test('omits top_k from Claude reverse proxy requests when disabled', async () => {
        const response = await fetch('http://127.0.0.1:3011/api/backends/chat-completions/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_completion_source: CHAT_COMPLETION_SOURCES.CLAUDE,
                reverse_proxy: 'http://127.0.0.1:3002/v1',
                proxy_password: 'test-key',
                model: 'claude-3-5-sonnet-latest',
                stream: false,
                temperature: 1,
                max_tokens: 32,
                top_p: 1,
                top_k: 40,
                claude_disable_top_k: true,
                messages: [
                    { role: 'user', content: 'Hello from Claude.' },
                ],
            }),
        });

        expect(response.status).toBe(200);
        expect(upstream.requests).toHaveLength(1);
        expect(upstream.requests[0]).toMatchObject({
            method: 'POST',
            url: '/v1/messages',
        });
        expect(upstream.requests[0].body).toEqual(expect.not.objectContaining({
            top_k: expect.anything(),
        }));
        expect(upstream.requests[0].body).toMatchObject({
            temperature: 1,
            top_p: 1,
        });
    });
});
