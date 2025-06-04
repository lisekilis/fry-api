import { Settings } from '../types';

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

export async function patchSettings(guildId: string, settings: Partial<Settings>, env: Env): Promise<void> {
	const currentSettings = await env.FRY_SETTINGS.get(guildId);
	const parsedSettings = currentSettings ? JSON.parse(currentSettings) : {};

	// Merge current and new settings
	const updatedSettings = { ...parsedSettings, ...settings };

	await env.FRY_SETTINGS.put(guildId, JSON.stringify(updatedSettings));
}
