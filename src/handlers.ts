import { ActionRow, MessageComponent, MessageComponentTypes, verifyKey } from 'discord-interactions';
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
	APIInteractionResponse,
	ApplicationCommandOptionType,
	APIActionRowComponent,
	APIMessageActionRowComponent,
	APIEmbed,
} from 'discord-api-types/v10';
import { getTimestamp } from 'discord-snowflake';

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
		await patchSettings(guildId, newSettings, env);
		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Update failed', { status: 500 });
	}
}
async function patchSettings(guildId: string, settings: any, env: Env): Promise<void> {
	const existingSettings = await env.FRY_SETTINGS.get(guildId);
	const parsedSettings = existingSettings ? JSON.parse(existingSettings) : {};
	const updatedSettings = { ...parsedSettings, ...settings };
	await env.FRY_SETTINGS.put(guildId, JSON.stringify(updatedSettings));
}
// Discord interactions
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
			return await handleApplicationCommand(interaction as APIChatInputApplicationCommandGuildInteraction, env);
		case InteractionType.MessageComponent:
			return handleMessageComponent(interaction as APIMessageComponentInteraction);
		default:
			return new Response('Interaction not handled', { status: 400 });
	}
}
function messageResponse(content: string, flags?: MessageFlags): Response {
	const response: APIInteractionResponse = {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			tts: false,
			content,
			embeds: [],
			allowed_mentions: { parse: [] },
			flags,
		},
	};
	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}
function embedResponse(
	embed: APIEmbed,
	content?: string,
	flags?: MessageFlags,
	components?: APIActionRowComponent<APIMessageActionRowComponent>[],
	attachment?: { data: ArrayBuffer; filename: string; contentType: string }
): Response {
	const response: APIInteractionResponse = {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			tts: false,
			content,
			embeds: [embed],
			allowed_mentions: { parse: [] },
			flags,
			components,
		},
	};

	if (attachment) {
		response.data.attachments = [
			{
				id: '0',
				filename: attachment.filename,
			},
		];
	}

	const responseBody = attachment ? new FormData() : undefined;

	if (responseBody && attachment) {
		// Add the JSON part
		const blob = new Blob([JSON.stringify(response)], { type: 'application/json' });
		responseBody.append('payload_json', blob);

		// Add the file part
		const file = new Blob([attachment.data], { type: attachment.contentType });
		responseBody.append('files[0]', file, attachment.filename);

		return new Response(responseBody);
	}

	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { 'Content-Type': 'multipart/form-data' },
	});
}
async function handleApplicationCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	try {
		console.log(`Processing command: ${interaction.data.name}`);

		switch (interaction.data.name) {
			case 'ping':
				return handlePingCommand(interaction);
			case 'config':
				return await handleConfigCommand(interaction, env);
			case 'submit':
				return await handleSubmissions(interaction, env);
			default:
				console.log(`Unknown command: ${interaction.data.name}`);
				return messageResponse(`Command '${interaction.data.name}' not implemented yet.`, MessageFlags.Ephemeral);
		}
	} catch (error) {
		console.error(`Error in handleApplicationCommand: ${error}`);
		return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
	}
}

async function handleConfigCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	// Validate the interaction has proper options structure
	if (
		!interaction.data.options?.[0] ||
		(interaction.data.options[0].type !== ApplicationCommandOptionType.Subcommand &&
			interaction.data.options[0].type !== ApplicationCommandOptionType.SubcommandGroup)
	) {
		return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);
	}

	try {
		switch (interaction.data.options[0].name) {
			case 'mod':
				if (!interaction.data.options[0].options?.find((option) => option.name === 'role')) {
					// Show current mod role (if any)
					const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
					const parsedSettings = settings ? JSON.parse(settings) : {};
					if (parsedSettings.modRoleId) {
						return messageResponse(`Current mod role: <@&${parsedSettings.modRoleId}>`, MessageFlags.Ephemeral);
					}
					return messageResponse('No mod role set', MessageFlags.Ephemeral);
				}

				// Set new mod role
				const roleOption = interaction.data.options[0].options.find((option) => option.name === 'role');
				if (!roleOption || roleOption.type !== ApplicationCommandOptionType.Role || typeof roleOption.value !== 'string') {
					return messageResponse('Invalid role provided', MessageFlags.Ephemeral);
				}

				await patchSettings(interaction.guild_id, { modRoleId: roleOption.value }, env);
				console.log(`Setting mod role: ${roleOption.value} for guild: ${interaction.guild_id}`);
				return messageResponse(`Succesfully set <@${roleOption.value}> as the image moderator.`, MessageFlags.Ephemeral);

			case 'channel':
				// Validate channel subcommand exists
				if (
					!interaction.data.options[0].options?.[0] ||
					interaction.data.options[0].options[0].type !== ApplicationCommandOptionType.Subcommand
				) {
					return messageResponse('Please provide a valid channel subcommand', MessageFlags.Ephemeral);
				}

				switch (interaction.data.options[0].options[0].name) {
					case 'pillow':
						if (!interaction.data.options[0].options[0].options?.find((option) => option.name === 'channel')) {
							const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
							const parsedSettings = settings ? JSON.parse(settings) : {};
							if (parsedSettings.pillowChannelId) {
								return messageResponse(`Current pillow channel: <#${parsedSettings.pillowChannelId}>`, MessageFlags.Ephemeral);
							}
							return messageResponse('No pillow channel set', MessageFlags.Ephemeral);
						}

						// Set new pillow channel
						const pillowChannelOption = interaction.data.options[0].options[0].options.find((option) => option.name === 'channel');
						if (!pillowChannelOption || typeof pillowChannelOption.value !== 'string') {
							return messageResponse('Invalid channel provided', MessageFlags.Ephemeral);
						}

						await patchSettings(interaction.guild_id, { pillowChannelId: pillowChannelOption.value }, env);
						console.log(`Setting pillow channel: ${pillowChannelOption.value} for guild: ${interaction.guild_id}`);
						return messageResponse(
							`Succesfully set <#${pillowChannelOption.value}> as the pillow submissions channel.`,
							MessageFlags.Ephemeral
						);

					case 'photo':
						if (!interaction.data.options[0].options[0].options?.find((option) => option.name === 'channel')) {
							// Show current photo channel (if any)
							const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
							const parsedSettings = settings ? JSON.parse(settings) : {};
							if (parsedSettings.photoChannelId) {
								return messageResponse(`Current photo channel: <#${parsedSettings.photoChannelId}>`, MessageFlags.Ephemeral);
							}
							return messageResponse('No photo channel set', MessageFlags.Ephemeral);
						}

						// Set new photo channel
						const photoChannelOption = interaction.data.options[0].options[0].options.find((option) => option.name === 'channel');
						if (!photoChannelOption || typeof photoChannelOption.value !== 'string') {
							return messageResponse('Invalid channel provided', MessageFlags.Ephemeral);
						}

						await patchSettings(interaction.guild_id, { photoChannelId: photoChannelOption.value }, env);
						console.log(`Setting photo channel: ${photoChannelOption.value} for guild: ${interaction.guild_id}`);
						return messageResponse(`Succesfully set <#${photoChannelOption.value}> as the group photo channel.`, MessageFlags.Ephemeral);

					default:
						return messageResponse('Unknown channel subcommand', MessageFlags.Ephemeral);
				}

			default:
				return messageResponse('Unknown subcommand', MessageFlags.Ephemeral);
		}
	} catch (error) {
		console.error(`Error in handleConfigCommand: ${error}`);
		return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
	}
}
function handlePingCommand(interaction: APIChatInputApplicationCommandGuildInteraction): Response {
	// Calculate response time in ms
	const interactionTimestamp = getTimestamp(`${BigInt(interaction.id)}`); //1420070400000 - discord epoch
	const responseTime = Date.now() - interactionTimestamp;

	return messageResponse(`🏓 Pong! (Response time: ${responseTime}ms)`);
}
async function handleSubmissions(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	if (!interaction.data.options?.[0] || interaction.data.options[0].type !== ApplicationCommandOptionType.Subcommand)
		return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);

	const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
	const parsedSettings = settings ? JSON.parse(settings) : {};

	switch (interaction.data.options[0].name) {
		case 'pillow':
			if (!parsedSettings.pillowChannelId) return messageResponse('No pillow channel set', MessageFlags.Ephemeral);
			if (interaction.channel.id !== parsedSettings.pillowChannelId)
				return messageResponse(`Please use the pillow submissions channel: <#${parsedSettings.pillowChannelId}>`, MessageFlags.Ephemeral);
			const fileOption = interaction.data.options[0].options?.find((option) => option.name === 'texture');

			if (!fileOption || fileOption.type !== ApplicationCommandOptionType.Attachment)
				return messageResponse('Please attach a pillow texture', MessageFlags.Ephemeral);
			const attachmentId = fileOption.value;
			const attachment = interaction.data.resolved?.attachments?.[attachmentId];
			if (!attachment) return messageResponse('Could not find the attached image', MessageFlags.Ephemeral);

			if (attachment.filename.split('.').pop()?.toLowerCase() !== 'png')
				return messageResponse('Please upload a PNG texture', MessageFlags.Ephemeral);

			// Get additional data
			const pillowName =
				(interaction.data.options[0].options?.find((option) => option.name === 'name')?.value as string) || 'Unnamed Pillow';
			const pillowType = interaction.data.options[0].options?.find((option) => option.name === 'type')?.value as string;
			const pillowTypeName = pillowType === PillowType.NORMAL ? 'Normal' : pillowType === PillowType.BODY ? 'Dakimakura' : 'Unknown';

			const userName =
				(interaction.data.options[0].options?.find((option) => option.name === 'username')?.value as string) ||
				interaction.member.user.username;

			// Download and store the attachment
			try {
				// Download the attachment
				const response = await fetch(attachment.url);
				if (!response.ok) {
					return messageResponse('Failed to download the attachment', MessageFlags.Ephemeral);
				}
				const buffer = await response.arrayBuffer();
				return embedResponse(
					{
						title: `${userName}'s Pillow Submission`,
						image: {
							url: `attachment://${interaction.member.user.id}_${pillowType}.png`,
						},
						fields: [
							{
								name: 'Name:',
								value: pillowName,
								inline: true,
							},
							{
								name: 'Type:',
								value: pillowTypeName,
								inline: true,
							},
						],
						footer: {
							text: `Submitted by ${interaction.member.user.username}`,
							icon_url: `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`,
						},
					},
					'Pillow submission received and stored!',
					undefined,
					[
						{
							type: 1,
							components: [
								{
									type: 2,
									style: 1,
									label: 'Approve',
									custom_id: `approve`,
								},
								{
									type: 2,
									style: 4,
									label: 'Deny',
									custom_id: `deny`,
								},
							],
						},
					],
					{
						data: buffer,
						filename: `${interaction.member.user.id}_${pillowType}.png`,
						contentType: 'image/png',
					}
				);
			} catch (error) {
				console.error('Error storing attachment:', error);
				return messageResponse('Failed to process the submission', MessageFlags.Ephemeral);
			}

		case 'photo':
			return messageResponse('Not implemented yet! (if ever)', MessageFlags.Ephemeral);
		default:
			break;
	}
	return messageResponse('I have no idea how you got here', MessageFlags.Ephemeral);
}
function handleMessageComponent(interaction: APIMessageComponentInteraction): Response {
	switch (interaction.data.custom_id) {
		case 'approve':
			return messageResponse('Button Pressed!', MessageFlags.Ephemeral);
		case 'deny':
			return messageResponse('Button Pressed!', MessageFlags.Ephemeral);
		default:
			return new Response('Button interaction not handled', { status: 400 });
	}
}
