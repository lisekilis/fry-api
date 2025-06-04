import discord from './discord';
import { handleListPillows, handleGetPillow, handleGetImage, handleListImages, handleHeadImage, handleHeadPillow } from './handlers/index';

async function validateToken(request: Request, env: Env): Promise<boolean> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !env.API_TOKEN) {
		return false;
	}

	const token = authHeader.replace('Bearer ', '');
	return token === (await env.API_TOKEN.get());
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;
		const pathParts = path.split('/').filter(Boolean);
		if (method === 'POST' && pathParts[0] === 'interactions') return await discord(request, env, ctx);
		if (!validateToken(request, env)) {
			return new Response('Unauthorized', { status: 401 });
		}
		switch (pathParts[0]) {
			case 'pillows':
				switch (true) {
					case method === 'GET' && pathParts[1] === 'list':
						return await handleListPillows(env);

					case method === 'GET' && /\d{18}_\w+/.test(pathParts[1]):
						return await handleGetPillow(env, pathParts[1]);

					case method === 'HEAD' && /\d{18}_\w+/.test(pathParts[1]):
						return await handleHeadPillow(env, pathParts[1]);
				}
				break;
			case 'photos':
				switch (true) {
					case method === 'GET' && pathParts[1] === 'list':
						return await handleListImages(env);

					case method === 'GET' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathParts[1]):
						return await handleGetImage(env, pathParts[1]);

					case method === 'HEAD' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathParts[1]):
						return await handleHeadImage(env, pathParts[1]);
				}
				break;
		}
		return new Response('Not found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
