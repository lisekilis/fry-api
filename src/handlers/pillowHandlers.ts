import { PillowType } from '../types';

export async function handleListPillows(env: Env): Promise<Response> {
	const list = await env.FRY_PILLOWS.list();

	const files =
		list.objects?.map((obj) => ({
			key: obj.key,
			pillowType: obj.customMetadata?.pillowType || PillowType.NORMAL,
			pillowName: obj.customMetadata?.pillowName || '',
			submittedAt: obj.customMetadata?.submittedAt || new Date(),
			discordApproverId: obj.customMetadata?.discordApproverId || '',
			discordUserId: obj.customMetadata?.discordUserId || '',
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

export async function handleGetPillowData(env: Env, pillowId: string): Promise<Response> {
	const object = await env.FRY_PILLOWS.get(pillowId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	return new Response(JSON.stringify(object.customMetadata), {
		headers: { 'Content-Type': 'application/json' },
	});
}

export async function handleUploadPillow(request: Request, env: Env): Promise<Response> {
	try {
		const formData = await request.formData();
		const file = formData.get('file');
		const discordUserId = formData.get('discordUserId') as string;
		const discordApproverId = formData.get('discordApproverId') as string;
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
		const key = `${userName}_${pillowType}`;

		await env.FRY_PILLOWS.put(key, file.stream(), {
			httpMetadata: {
				contentType: file.type,
			},
			customMetadata: {
				discordUserId,
				discordApproverId,
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
