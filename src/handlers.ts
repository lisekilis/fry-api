import { PillowType } from './types';

export async function handleListPillows(env: Env): Promise<Response> {
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

export async function handleGetPillow(env: Env, pillowId: string): Promise<Response> {
	const object = await env.FRY_PILLOWS.get(pillowId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	const body = await object.arrayBuffer();
	return new Response(body, {
		headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream' },
	});
}

export async function handleUploadPillow(request: Request, env: Env): Promise<Response> {
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

export async function handleDeletePillow(env: Env, pillowId: string): Promise<Response> {
	try {
		await env.FRY_PILLOWS.delete(pillowId);
		return new Response(JSON.stringify({ success: true, key: pillowId }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Delete failed', { status: 500 });
	}
}

export async function handleListImages(env: Env): Promise<Response> {
	const list = await env.FRY_PHOTOS.list();
	const files =
		list.objects?.map((obj: R2Object) => ({
			key: obj.key,
			submittedAt: obj.customMetadata?.submittedAt || new Date(),
			date: obj.customMetadata?.date || '',
			discordUserId: obj.customMetadata?.discordUserId || 0,
			userName: obj.customMetadata?.userName || '',
		})) || [];
	return new Response(JSON.stringify(files), {
		headers: { 'Content-Type': 'application/json' },
	});
}
export async function handleGetImage(env: Env, imageId: string): Promise<Response> {
	const object = await env.FRY_PHOTOS.get(imageId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	const body = await object.arrayBuffer();
	return new Response(body, {
		headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream' },
	});
}
export async function handleUploadImage(request: Request, env: Env): Promise<Response> {
	try {
		const formData = await request.formData();
		const file = formData.get('file');
		const discordUserId = formData.get('discordUserId') as string;
		const submittedAt = (formData.get('submittedAt') as string) || new Date().toISOString();
		const date = formData.get('date') as string;
		const userName = formData.get('userName') as string;

		if (!file || !(file instanceof File)) {
			return new Response('File missing or invalid', { status: 400 });
		}
		if (!discordUserId || !userName) {
			return new Response('Missing discordUserId or userName', { status: 400 });
		}
		const key = crypto.randomUUID();

		await env.FRY_PHOTOS.put(key, file.stream(), {
			httpMetadata: {
				contentType: file.type,
			},
			customMetadata: {
				discordUserId,
				submittedAt,
				date,
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
export async function handleDeleteImage(env: Env, imageId: string): Promise<Response> {
	try {
		await env.FRY_PHOTOS.delete(imageId);
		return new Response(JSON.stringify({ success: true, key: imageId }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Delete failed', { status: 500 });
	}
}
export async function handleGetSettings(env: Env, id: string): Promise<Response> {
	const settings = await env.FRY_SETTINGS.get('settings');
	return new Response(JSON.stringify(settings), {
		headers: { 'Content-Type': 'application/json' },
	});
}
export async function handleSetSettings(request: Request, env: Env, guildId: string): Promise<Response> {
	try {
		const formData = await request.formData();
		const settings = JSON.parse(formData.get('settings') as string);
		await env.FRY_SETTINGS.put(guildId, settings);
		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Update failed', { status: 500 });
	}
}
