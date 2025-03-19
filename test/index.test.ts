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
// Tests for authentication
it('returns 401 when no authorization header is provided', async () => {
	const request = new IncomingRequest('http://example.com/pillow/list');
	const ctx = createExecutionContext();
	//@ts-expect-error
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	expect(response.status).toBe(401);
	expect(await response.text()).toBe('Unauthorized');
});

it('returns 401 when invalid token is provided', async () => {
	const request = new IncomingRequest('http://example.com/pillow/list', {
		headers: { Authorization: 'Bearer invalid-token' },
	});
	const ctx = createExecutionContext();
	const mockEnv = { ...env, API_TOKEN: 'correct-token' };
	//@ts-expect-error
	const response = await worker.fetch(request, mockEnv, ctx);
	await waitOnExecutionContext(ctx);
	expect(response.status).toBe(401);
});

// Tests for pillow endpoints
describe('Pillow endpoints', () => {
	const mockToken = 'test-token';
	const authHeaders = { Authorization: `Bearer ${mockToken}` };
	const mockEnv = { ...env, API_TOKEN: mockToken };

	it('handles GET /pillow/list', async () => {
		const request = new IncomingRequest('http://example.com/pillow/list', {
			headers: authHeaders,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('handles GET /pillow/data/:id', async () => {
		const pillowId = 'test-pillow-id';
		const request = new IncomingRequest(`http://example.com/pillow/data/${pillowId}`, {
			headers: authHeaders,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('handles GET /pillow/texture/:id', async () => {
		const pillowId = 'test-pillow-id';
		const request = new IncomingRequest(`http://example.com/pillow/texture/${pillowId}`, {
			headers: authHeaders,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('handles POST /pillow/upload', async () => {
		const request = new IncomingRequest('http://example.com/pillow/upload', {
			method: 'POST',
			headers: authHeaders,
			body: 'test-pillow-data',
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('handles DELETE /pillow/delete/:id', async () => {
		const pillowId = 'test-pillow-id';
		const request = new IncomingRequest(`http://example.com/pillow/delete/${pillowId}`, {
			method: 'DELETE',
			headers: authHeaders,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});
});

// Tests for photos endpoints
describe('Photos endpoints', () => {
	const mockToken = 'test-token';
	const authHeaders = { Authorization: `Bearer ${mockToken}` };
	const mockEnv = { ...env, API_TOKEN: mockToken };

	it('handles GET /photos/list', async () => {
		const request = new IncomingRequest('http://example.com/photos/list', {
			headers: authHeaders,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('handles GET /photos/image/:id', async () => {
		const imageId = 'test-image-id';
		const request = new IncomingRequest(`http://example.com/photos/image/${imageId}`, {
			headers: authHeaders,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('handles GET /photos/data/:id', async () => {
		const imageId = 'test-image-id';
		const request = new IncomingRequest(`http://example.com/photos/data/${imageId}`, {
			headers: authHeaders,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('handles POST /photos/upload', async () => {
		const request = new IncomingRequest('http://example.com/photos/upload', {
			method: 'POST',
			headers: authHeaders,
			body: 'test-image-data',
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('handles DELETE /photos/delete/:id', async () => {
		const imageId = 'test-image-id';
		const request = new IncomingRequest(`http://example.com/photos/delete/${imageId}`, {
			method: 'DELETE',
			headers: authHeaders,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('returns 404 for unknown photo endpoint', async () => {
		const request = new IncomingRequest('http://example.com/photos/unknown', {
			headers: authHeaders,
		});
		const ctx = createExecutionContext();
		//@ts-expect-error
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
		expect(await response.text()).toBe('Not found');
	});
});

// Test for unknown endpoint
it('returns 404 for unknown main endpoint', async () => {
	const request = new IncomingRequest('http://example.com/unknown', {
		headers: { Authorization: 'Bearer test-token' },
	});
	const ctx = createExecutionContext();
	const mockEnv = { ...env, API_TOKEN: 'test-token' };
	//@ts-expect-error
	const response = await worker.fetch(request, mockEnv, ctx);
	await waitOnExecutionContext(ctx);
	expect(response.status).toBe(404);
	expect(await response.text()).toBe('Not found');
});
