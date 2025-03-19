import { verifyKey } from 'discord-interactions';
import { PillowType } from './types';
import {
	APIBaseInteraction,
	InteractionType,
	InteractionResponseType,
	APIApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIChatInputApplicationCommandGuildInteraction,
	APIMessageComponentButtonInteraction,
	MessageFlags,
	APIApplicationCommandInteractionDataStringOption,
} from 'discord-api-types/v10';

export async function handleListPillows(env: Env): Promise<Response> {
	const list = await env.FRY_PILLOWS.list();

	const files =
		list.objects?.map((obj: R2Object) => ({
			key: obj.key,
			pillowType: obj.customMetadata?.pillowType || PillowType.NORMAL,
			pillowName: obj.customMetadata?.pillowName || '',
			submittedAt: obj.customMetadata?.submittedAt || new Date(),
			discordApproverId: obj.customMetadata?.discordApproverId || 0,
			discordUserId: obj.customMetadata?.discordUserId || 0,
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
		const key = `${discordUserId}_${pillowType}`;

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
export async function handleGetImageData(env: Env, imageId: string): Promise<Response> {
	const object = await env.FRY_PHOTOS.get(imageId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	return new Response(JSON.stringify(object.customMetadata), {
		headers: { 'Content-Type': 'application/json' },
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
export async function handlePatchSettings(request: Request, env: Env, guildId: string): Promise<Response> {
	try {
		const formData = await request.formData();
		const newSettings = JSON.parse(formData.get('settings') as string); // Fetch existing settings
		const existingSettings = await env.FRY_SETTINGS.get(guildId);
		const parsedSettings = existingSettings ? JSON.parse(existingSettings) : {};
		const updatedSettings = { ...parsedSettings, ...newSettings };
		await env.FRY_SETTINGS.put(guildId, JSON.stringify(updatedSettings));
		return new Response(JSON.stringify({ updatedSettings }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Update failed', { status: 500 });
	}
}

export async function handleDiscordInteractions(request: Request, env: Env): Promise<Response> {
	const signature = request.headers.get('x-signature-ed25519');
	const timestamp = request.headers.get('x-signature-timestamp');
	const body = await request.text();
	if (!signature || !timestamp || !(await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY))) {
		return new Response('Bad request signature', { status: 401 });
	}
	const interaction = JSON.parse(body) as APIBaseInteraction<InteractionType, any>;

	switch (interaction.type) {
		case InteractionType.Ping:
			return new Response(JSON.stringify({ type: InteractionResponseType.Pong }), { status: 200 });
		case InteractionType.ApplicationCommand:
			return handleApplicationCommand(interaction as APIChatInputApplicationCommandGuildInteraction, env);
		case InteractionType.MessageComponent:
			return handleMessageComponent(interaction as APIMessageComponentInteraction);
		default:
			return new Response('Interaction not handled', { status: 400 });
	}
}

async function handleApplicationCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	switch (interaction.data.name) {
		case 'ping':
			return handlePingCommand(interaction);
		case 'setmodrole':
			return handleSetModRole(interaction, env);
		default:
			return new Response('Command not handled', { status: 400 });
	}
}

// Add this new function to handle the ping command
async function handlePingCommand(interaction: APIChatInputApplicationCommandGuildInteraction): Promise<Response> {
	return messageResponse('🏓 Pong!');
}

async function handleSetModRole(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	if (!interaction.guild_id || !interaction.member) {
		return messageResponse('This command can only be used in a guild', MessageFlags.Ephemeral);
	}

	if (!interaction.member.permissions || !interaction.member.permissions.includes('ADMINISTRATOR')) {
		return messageResponse('You do not have the required permissions to use this command', MessageFlags.Ephemeral);
	}

	const roleOption = interaction.data.options?.find((option) => option.name === 'role') as APIApplicationCommandInteractionDataStringOption;
	if (!roleOption || typeof roleOption.value !== 'string') {
		return messageResponse('The role provided is invalid', MessageFlags.Ephemeral);
	}

	const roleId = roleOption.value;

	try {
		await patchSettings(interaction.guild_id, { modRoleId: roleId }, env);
		return messageResponse(`The role has been set as the image moderator role`, MessageFlags.Ephemeral);
	} catch (error) {
		console.error(`Failed to set the role: ${error}`);
		return messageResponse('An error occurred while setting the role', MessageFlags.Ephemeral);
	}
}

async function patchSettings(guildId: string, settings: any, env: Env): Promise<void> {
	const existingSettings = await env.FRY_SETTINGS.get(guildId);
	const parsedSettings = existingSettings ? JSON.parse(existingSettings) : {};
	const updatedSettings = { ...parsedSettings, ...settings };
	await env.FRY_SETTINGS.put(guildId, JSON.stringify(updatedSettings));
}

async function messageResponse(content: string, flags?: MessageFlags): Promise<Response> {
	const response = {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			content,
			flags,
		},
	};
	return new Response(JSON.stringify(response), { status: 200 });
}

function handleMessageComponent(interaction: APIMessageComponentInteraction): Response {
	switch (interaction.data.custom_id) {
		case 'approve':
			return new Response(JSON.stringify({ content: 'Button clicked', flags: 64 }), { status: 200 });
		case 'deny':
			return new Response(JSON.stringify({ content: 'Button clicked', flags: 64 }), { status: 200 });
		default:
			return new Response('Button interaction not handled', { status: 400 });
	}
}
