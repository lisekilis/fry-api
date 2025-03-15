// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';
import { validateToken } from '../src/index';
// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Hello World worker', () => {
	it('responds with Hello World! (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});

	it('responds with Hello World! (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});

	describe('validateToken', () => {
		it('returns false if Authorization header is missing', () => {
			const request = new IncomingRequest('http://example.com');
			const result = validateToken(request, env);
			expect(result).toBe(false);
		});

		it('returns false if token is incorrect', () => {
			const request = new IncomingRequest('http://example.com', {
				headers: { Authorization: 'Bearer wrong-token' },
			});
			const result = validateToken(request, env);
			expect(result).toBe(false);
		});

		it('returns true if token is correct', () => {
			const request = new IncomingRequest('http://example.com', {
				headers: { Authorization: `Bearer ${env.SECRET_TOKEN}` },
			});
			const result = validateToken(request, env);
			expect(result).toBe(true);
		});
	});
});
