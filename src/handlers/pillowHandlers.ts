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

export async function handleHeadPillow(env: Env, pillowId: string): Promise<Response> {
	const object = await env.FRY_PILLOWS.head(pillowId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	return new Response(JSON.stringify(object), {
		headers: { 'Content-Type': 'application/json' },
	});
}
