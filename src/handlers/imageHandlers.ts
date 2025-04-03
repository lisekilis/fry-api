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
export async function handleHeadImage(env: Env, photoId: string): Promise<Response> {
	const object = await env.FRY_PHOTOS.head(photoId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	return new Response(JSON.stringify(object), {
		headers: { 'Content-Type': 'application/json' },
	});
}
