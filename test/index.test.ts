import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';
import crypto from 'crypto';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Worker tests', () => {
	it('responds with not found and proper status for /404', async () => {
		const request = new IncomingRequest('http://example.com/404');
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(await response.status).toBe(404);
		expect(await response.text()).toBe('Not found');
	});
	it('denies Incorrect signature', async () => {
		const request = new IncomingRequest('http://example.com/interactions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type: 1 }),
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
		expect(await response.text()).toEqual('Bad request signature');
	});

	it('responds to PING payload with PONG payload', async () => {
		const body = JSON.stringify({ type: 1 });
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const discordPublicKey = crypto.randomBytes(32).toString('hex'); // Generate a new random key
		if (!discordPublicKey) {
			throw new Error('DISCORD_PUBLIC_KEY is not defined');
		}
		const signature = crypto
			.createHmac('sha256', discordPublicKey)
			.update(timestamp + body)
			.digest('hex');

		const request = new IncomingRequest('http://example.com/interactions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-signature-ed25519': signature,
				'x-signature-timestamp': timestamp,
			},
			body,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ type: 1 });
	});
});
