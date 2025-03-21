export async function handleGetSettings(env: Env, id: string): Promise<Response> {
	const settings = await env.FRY_SETTINGS.get(id);
	if (!settings) {
		return new Response(JSON.stringify({}), {
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return new Response(settings, {
		headers: { 'Content-Type': 'application/json' },
	});
}

export async function handlePatchSettings(request: Request, env: Env, guildId: string): Promise<Response> {
	try {
		const currentSettings = await env.FRY_SETTINGS.get(guildId);
		const parsedSettings = currentSettings ? JSON.parse(currentSettings) : {};
		const newSettings = await request.json();

		// Merge current and new settings
		const updatedSettings = { ...(parsedSettings || {}), ...(newSettings || {}) };

		await patchSettings(guildId, newSettings, env);

		return new Response(JSON.stringify(updatedSettings), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Failed to update settings', { status: 500 });
	}
}

export async function patchSettings(guildId: string, settings: any, env: Env): Promise<void> {
	const currentSettings = await env.FRY_SETTINGS.get(guildId);
	const parsedSettings = currentSettings ? JSON.parse(currentSettings) : {};

	// Merge current and new settings
	const updatedSettings = { ...parsedSettings, ...settings };

	await env.FRY_SETTINGS.put(guildId, JSON.stringify(updatedSettings));
}
