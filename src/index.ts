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
enum PillowType {
	NORMAL = 'NORMAL',
	BODY = 'BODY',
}

export function validateToken(request: Request, env: Env): boolean {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) {
		return false;
	}

	const token = authHeader.replace('Bearer ', '');
	return token === env.SECRET_TOKEN;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Validate the token
		if (!validateToken(request, env)) {
			return new Response('Unauthorized', { status: 401 });
		}

		const url = new URL(request.url);

		// --------------------------
		// List images endpoint: GET /list
		// --------------------------
		if (request.method === 'GET' && url.pathname === '/list') {
			const list = await env.FRY_PILLOWS.list();
			const files =
				list.objects?.map((obj: R2Object) => ({
					key: obj.key,
					pillowName: obj.customMetadata?.pillowName || '',
					submittedAt: obj.customMetadata?.submittedAt || new Date(),
					discordUserId: obj.customMetadata?.discordUserId || 0,
					pillowType: obj.customMetadata?.pillowType || PillowType.NORMAL,
					userName: obj.customMetadata?.userName || '',
				})) || [];
			return new Response(JSON.stringify(files), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// --------------------------
		// Get image endpoint: GET /image/<key>
		// --------------------------
		if (request.method === 'GET' && url.pathname.startsWith('/image/')) {
			const key = url.pathname.replace('/image/', '');
			const object = await env.FRY_PILLOWS.get(key);
			if (!object) {
				return new Response('Not found', { status: 404 });
			}
			const body = await object.arrayBuffer();
			return new Response(body, {
				headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream' },
			});
		}

		// --------------------------
		// Upload image endpoint: POST /upload
		// --------------------------
		if (request.method === 'POST' && url.pathname === '/upload') {
			try {
				const formData = await request.formData();
				const file = formData.get('file');
				const discordUserId = formData.get('discordUserId') as string;
				const pillowName = formData.get('pillowName') as string;
				const submittedAt = (formData.get('submittedAt') as string) || new Date().toISOString();
				const pillowType = formData.get('pillowType') as PillowType;
				const userName = formData.get('userName') as string;

				if (!file || !(file instanceof File)) {
					return new Response('File missing or invalid', { status: 400 });
				}
				if (!discordUserId || !userName || !pillowName || !pillowType) {
					return new Response('Missing discordUserId, userName, pillowName or pillowType', { status: 400 });
				}
				const key = `${discordUserId}_${pillowType}`;

				await env.FRY_PILLOWS.put(key, file.stream(), {
					httpMetadata: {
						contentType: file.type,
					},
					customMetadata: {
						discordUserId,
						submittedAt,
						pillowName,
						pillowType,
						userName,
					},
				});

				return new Response(JSON.stringify({ success: true, key }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (err) {
				return new Response('Upload failed', { status: 500 });
			}
		}

		// --------------------------
		// Delete image endpoint: DELETE /delete/<key>
		// --------------------------
		if (request.method === 'DELETE' && url.pathname.startsWith('/delete/')) {
			const key = url.pathname.replace('/delete/', '');
			try {
				await env.FRY_PILLOWS.delete(key);
				return new Response(JSON.stringify({ success: true, key }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (err) {
				return new Response('Delete failed', { status: 500 });
			}
		}

		if (request.method === 'GET' && url.pathname.startsWith('/mod/')) {
			const key = url.pathname.replace('/mod/', '');
			try {
				const id = env.MOD_ROLES.get(key);
			} catch (err) {
				return new Response('Failed to get Mod ID', { status: 500 });
			}
		}
		if (request.method === 'POST' && url.pathname.startsWith('/mod/')) {
			const key = url.pathname.replace('/mod/', '');
			try {
				const formData = await request.formData();
				const roleId = formData.get('roleId');
				if (roleId) {
					await env.MOD_ROLES.put(key, roleId.toString());
				} else {
					return new Response('roleId is missing', { status: 400 });
				}
			} catch (err) {
				return new Response('Failed to set Mod Role ID', { status: 500 });
			}
		}
		return new Response('Not found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
