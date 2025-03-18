/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import {
	handleListPillows,
	handleGetPillow,
	handleDeletePillow,
	handleUploadPillow,
	handleDeleteImage,
	handleGetImage,
	handleListImages,
	handleUploadImage,
	handleGetPillowData,
	handleGetImageData,
	handleDiscordInteractions,
} from './handlers';

async function validateToken(request: Request, env: Env): Promise<boolean> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !env.API_TOKEN) {
		return false;
	}

	const token = authHeader.replace('Bearer ', '');
	return token === env.API_TOKEN;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;
		// Split the path into parts
		const pathParts = path.split('/').filter(Boolean);
		if (method === 'POST' && pathParts[2] === 'interactions') return handleDiscordInteractions(request, env);

		// Validate the token
		if (!validateToken(request, env)) {
			return new Response('Unauthorized', { status: 401 });
		}
		switch (pathParts[0]) {
			case 'pillow':
				switch (true) {
					case method === 'GET' && pathParts[2] === 'list':
						return await handleListPillows(env);

					case method === 'GET' && pathParts[2] === 'data':
						return await handleGetPillowData(env, pathParts[3]);

					case method === 'GET' && pathParts[2] === 'texture':
						return await handleGetPillow(env, pathParts[3]);

					case method === 'POST' && pathParts[2] === 'upload':
						return await handleUploadPillow(request, env);

					case method === 'DELETE' && pathParts[2] === 'delete':
						return await handleDeletePillow(env, pathParts[3]);

					default:
						return new Response('Not found', { status: 404 });
				}
			case 'photos':
				switch (true) {
					case method === 'GET' && pathParts[2] === 'list':
						return await handleListImages(env);

					case method === 'GET' && pathParts[2] === 'image':
						return await handleGetImage(env, pathParts[3]);

					case method === 'GET' && pathParts[2] === 'data':
						return await handleGetImageData(env, pathParts[3]);

					case method === 'POST' && pathParts[2] === 'upload':
						return await handleUploadImage(request, env);

					case method === 'DELETE' && pathParts[2] === 'delete':
						return await handleDeleteImage(env, pathParts[3]);

					default:
						return new Response('Not found', { status: 404 });
				}

			default:
				return new Response('Not found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;
