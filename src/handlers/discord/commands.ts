import {
	APIApplicationCommandInteractionDataBasicOption,
	APIChatInputApplicationCommandGuildInteraction,
	APIEmbed,
	APIEmbedField,
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
} from 'discord-api-types/v10';
import { messageResponse, embedResponse } from './responses';
import { PhotoR2Objects, PillowR2Objects, PillowType } from '../../types';
import { patchSettings } from '../settingsHandlers';
import { getTimestamp } from 'discord-snowflake';
import { paginationButtons, listPillowsEmbed, listPhotosEmbed } from './util';

export function handlePingCommand(interaction: APIChatInputApplicationCommandGuildInteraction): Response {
	const startTime = getTimestamp(`${BigInt(interaction.id)}`);
	const endTime = Date.now();
	const ping = endTime - startTime;

	return messageResponse(`🏓Pong! (${ping}ms)`);
}

export async function handleConfigCommand(
	interaction: APIChatInputApplicationCommandGuildInteraction,
	env: Env,
	ctx: ExecutionContext
): Promise<Response> {
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
				if (!interaction.data.options[0].options) {
					// Show current mod role (if any)
					const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
					const parsedSettings = settings ? JSON.parse(settings) : {};
					if (parsedSettings.modRoleId) {
						return messageResponse(`Current mod role: <@&${parsedSettings.modRoleId}>`, MessageFlags.Ephemeral);
					}
					return messageResponse('No mod role set', MessageFlags.Ephemeral);
				}

				// Set new mod role
				const roleOption = interaction.data.options[0].options.find(
					(option) => option.name === 'role'
				) as APIApplicationCommandInteractionDataBasicOption;
				if (!roleOption || typeof roleOption.value !== 'string') {
					return messageResponse('Invalid role provided', MessageFlags.Ephemeral);
				}
				await patchSettings(interaction.guild_id, { modRoleId: roleOption.value }, env);
				console.log(`Setting mod role: ${roleOption.value} for guild: ${interaction.guild_id}`);
				return messageResponse('Mod role set successfully', MessageFlags.Ephemeral);

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
						if (!interaction.data.options[0].options[0].options) {
							// Show current pillow channel (if any)
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
						return messageResponse('Pillow channel set successfully', MessageFlags.Ephemeral);

					case 'photo':
						if (!interaction.data.options[0].options[0].options) {
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
						return messageResponse('Photo channel set successfully', MessageFlags.Ephemeral);
				}
			case 'global':
				if (interaction.member.user.id !== env.FRY_OWNER_ID)
					return messageResponse(`Only <@${env.FRY_OWNER_ID}> can change the global settings`, MessageFlags.Ephemeral);
				if (
					!interaction.data.options[0].options?.[0] ||
					interaction.data.options[0].options[0].type !== ApplicationCommandOptionType.Subcommand
				) {
					return messageResponse('Please provide a valid channel subcommand', MessageFlags.Ephemeral);
				}
				switch (interaction.data.options[0].options[0].name) {
					case 'whitelist':
						const whitelistOptions = {
							guild: interaction.data.options[0].options[0].options?.find((option) => option.name === 'guild')?.value,
							name: interaction.data.options[0].options[0].options?.find((option) => option.name === 'name')?.value,
							toggle: interaction.data.options[0].options[0].options?.find((option) => option.name === 'toggle')?.value ?? true,
						};

						if (!whitelistOptions.guild && !whitelistOptions.name) {
							const settings = await env.FRY_SETTINGS.list();
							// Show current whitelist (if any)
							if (settings.keys.length > 0) {
								return messageResponse(`Current whitelist: \`\`\`ts\n${JSON.stringify(settings.keys)}\`\`\``, MessageFlags.Ephemeral);
							}
							return messageResponse('No whitelist set', MessageFlags.Ephemeral);
						}

						if (!whitelistOptions.guild || typeof whitelistOptions.guild !== 'string')
							return messageResponse('Invalid options provided', MessageFlags.Ephemeral);

						if (!whitelistOptions.toggle) {
							console.log(`Removing whitelist for guild: ${interaction.guild_id}`);
							await env.FRY_SETTINGS.delete(interaction.guild_id);
							return messageResponse('Whitelist removed successfully', MessageFlags.Ephemeral);
						}
						if (!whitelistOptions.name || typeof whitelistOptions.name !== 'string')
							return messageResponse('Invalid name provided', MessageFlags.Ephemeral);
						console.log(`Setting whitelist: ${whitelistOptions.guild} for guild: ${interaction.guild_id}`);
						ctx.waitUntil(patchSettings(whitelistOptions.guild, { name: whitelistOptions.name }, env));
						return messageResponse('Whitelist set successfully', MessageFlags.Ephemeral);
				}

			default:
				return messageResponse('Unknown subcommand', MessageFlags.Ephemeral);
		}
	} catch (error) {
		console.error(`Error in handleConfigCommand: ${error}`);
		return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
	}
}
export async function handleDeleteCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	if (interaction.data.options?.[0].type !== ApplicationCommandOptionType.Subcommand)
		return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);

	switch (interaction.data.options[0].name) {
		case 'pillow':
			const pillowId = interaction.data.options[0].options?.find((option) => option.name === 'id')?.value as string;
			if (!pillowId) return messageResponse('Please provide a valid ID', MessageFlags.Ephemeral);
			try {
				await env.FRY_PILLOWS.delete(pillowId);
			} catch (error) {
				return messageResponse('Failed to delete pillow', MessageFlags.Ephemeral);
			}
			return messageResponse('Pillow deleted successfully', MessageFlags.Ephemeral);
		case 'photo':
			const photoId = interaction.data.options[0].options?.find((option) => option.name === 'id')?.value as string;
			if (!photoId) return messageResponse('Please provide a valid ID', MessageFlags.Ephemeral);
			try {
				await env.FRY_PHOTOS.delete(photoId);
			} catch (error) {
				return messageResponse('Failed to delete photo', MessageFlags.Ephemeral);
			}
			return messageResponse('Photo deleted successfully', MessageFlags.Ephemeral);
		default:
			return messageResponse('Unknown subcommand', MessageFlags.Ephemeral);
	}
}
export async function handleListCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	if (interaction.data.options?.[0].type !== ApplicationCommandOptionType.Subcommand)
		return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);

	const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
	const parsedSettings = settings ? JSON.parse(settings) : {};
	const pageSize = (interaction.data.options[0].options?.find((option) => option.name === 'count')?.value as number) ?? 10;
	switch (interaction.data.options[0].name) {
		case 'pillows':
			if (!parsedSettings.pillowChannelId)
				return messageResponse(
					'The pillow submissions channel has not been configured. Please ask an admin to set it up.',
					MessageFlags.Ephemeral
				);
			const pillows = await env.FRY_PILLOWS.list({ include: ['customMetadata'] });
			if (!pillows.objects) return messageResponse('No pillows found', MessageFlags.Ephemeral);
			const pillowCount = pillows.objects.length;
			const pageCount = Math.ceil(pillowCount / pageSize);
			const components = paginationButtons(pageSize, 1, pageCount);
			const embed = listPillowsEmbed(pillows as PillowR2Objects, 1, pageSize, pageCount, pillowCount);
			return embedResponse(embed, `Found ${pillowCount} pillows`, undefined, components);

		case 'photos':
			if (!parsedSettings.photoChannelId)
				return messageResponse('The photo channel has not been configured. Please ask an admin to set it up.', MessageFlags.Ephemeral);
			const photos = await env.FRY_PHOTOS.list();
			if (!photos.objects) return messageResponse('No photos found', MessageFlags.Ephemeral);
			const photoCount = photos.objects.length;
			const photoPageCount = Math.ceil(photoCount / pageSize);
			const photoComponents = paginationButtons(pageSize, 1, photoPageCount);
			const photoEmbed = listPhotosEmbed(photos as PhotoR2Objects, 1, pageSize, photoPageCount, photoCount);
			return embedResponse(photoEmbed, `Found ${photoCount} photos`, undefined, photoComponents);

		default:
			return messageResponse('Unknown subcommand', MessageFlags.Ephemeral);
	}
}
export async function handleSubmitCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	// Guard conditions - ensure we have proper subcommand
	if (!interaction.data.options?.[0]) return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);

	if (interaction.data.options[0].type !== ApplicationCommandOptionType.Subcommand)
		return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);

	try {
		const subcommand = interaction.data.options[0];
		switch (subcommand.name) {
			case 'pillow': {
				// Ensure settings are configured
				const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
				const parsedSettings = settings ? JSON.parse(settings) : {};
				if (!parsedSettings.pillowChannelId) {
					return messageResponse(
						'The pillow submissions channel has not been configured. Please ask an admin to set it up.',
						MessageFlags.Ephemeral
					);
				}
				if (!parsedSettings.modRoleId) {
					return messageResponse(
						'The image moderator role has not been configured. Please ask an admin to set it up.',
						MessageFlags.Ephemeral
					);
				}
				if (interaction.channel.id !== parsedSettings.pillowChannelId)
					return messageResponse(`Please use the pillow submissions channel: <#${parsedSettings.pillowChannelId}>`, MessageFlags.Ephemeral);

				// Get pillow details
				const nameOption = subcommand.options?.find((option) => option.name === 'name');
				const typeOption = subcommand.options?.find((option) => option.name === 'type');
				const textureOption = subcommand.options?.find((option) => option.name === 'texture');
				const usernameOption = subcommand.options?.find((option) => option.name === 'username');

				if (!nameOption || !typeOption || !textureOption) return messageResponse('Missing required options', MessageFlags.Ephemeral);

				const pillowName = nameOption.value as string;
				const pillowType = typeOption.value as PillowType;
				const attachmentId = textureOption.value as string;
				const userName = (usernameOption?.value as string) || interaction.member.user.username;

				// Get the attached texture
				const attachment = interaction.data.resolved?.attachments?.[attachmentId];
				if (!attachment) {
					return messageResponse('Texture attachment not found', MessageFlags.Ephemeral);
				}
				// Validate texture is png
				if (!attachment.content_type?.includes('png')) {
					return messageResponse('Texture must be a PNG image', MessageFlags.Ephemeral);
				}
				const response = await fetch(attachment.url);
				if (!response.ok) {
					return messageResponse('Failed to download the attachment', MessageFlags.Ephemeral);
				}

				const imageBuffer = await response.arrayBuffer();

				// upload the pillow to r2
				try {
					await env.FRY_PILLOW_SUBMISSIONS.put(`${interaction.member.user.id}_${pillowType}`, imageBuffer, {
						httpMetadata: {
							contentType: 'image/png',
						},
						customMetadata: {
							userId: interaction.member.user.id,
							userName,
							name: pillowName,
							type: pillowType,
						},
					});
				} catch (error) {
					console.error('R2 upload error:', error);
					return messageResponse(
						`Failed to upload image to storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
						MessageFlags.Ephemeral
					);
				}

				// Create embed for the submission
				const fields: APIEmbedField[] = [
					{
						name: 'Name:',
						value: pillowName,
						inline: true,
					},
					{
						name: 'Type:',
						value: pillowType,
						inline: true,
					},
				];

				const embed: APIEmbed = {
					title: `${userName}'s Pillow Submission`,
					description: `A new pillow submission has been received from <@${interaction.member.user.id}>`,
					thumbnail: {
						url: `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`,
					},
					color: 0x9469c9,
					fields,
					image: {
						url: `attachment://${interaction.member.user.id}_${pillowType}.png`,
					},
				};

				// Post to the submissions channel

				return embedResponse(
					embed,
					'New pillow submission received',
					undefined,
					[
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									style: ButtonStyle.Primary,
									label: 'Approve',
									custom_id: 'approve',
								},
								{
									type: ComponentType.Button,
									style: ButtonStyle.Danger,
									label: 'Deny',
									custom_id: 'deny',
								},
							],
						},
					],
					{
						data: imageBuffer,
						filename: `${interaction.member.user.id}_${pillowType}.png`,
						contentType: 'image/png',
					}
				);
			}

			case 'photo': {
				return messageResponse('Photo submissions are not yet implemented', MessageFlags.Ephemeral);
			}

			default:
				return messageResponse(`Unknown submission type: ${subcommand.name}`, MessageFlags.Ephemeral);
		}
	} catch (error) {
		console.error(`Error in handleSubmission: ${error}`);
		return messageResponse('An error occurred while processing your submission', MessageFlags.Ephemeral);
	}
}
export async function handleUploadCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	if (!interaction.data.options?.[0] || interaction.data.options[0].type !== ApplicationCommandOptionType.Subcommand)
		return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);
	const id = crypto.randomUUID();
	switch (interaction.data.options[0].name) {
		case 'photo':
			const attachmentId = interaction.data.options[0].options?.find((option) => option.name === 'image')?.value as string;
			const date = interaction.data.options[0].options?.find((option) => option.name === 'date')?.value as string;
			if (!attachmentId) return messageResponse('Please provide a valid ID and attachment', MessageFlags.Ephemeral);
			// Get the attachment
			const attachment = interaction.data.resolved?.attachments?.[attachmentId];
			if (!attachment) return messageResponse('Attachment not found', MessageFlags.Ephemeral);

			// Validate attachment is png
			if (!attachment.content_type?.includes('png')) return messageResponse('Attachment must be a PNG image', MessageFlags.Ephemeral);

			// Download the attachment
			const response = await fetch(attachment.url);
			if (!response.ok) return messageResponse('Failed to download the attachment', MessageFlags.Ephemeral);

			await env.FRY_PHOTOS.put(id, response.body, {
				httpMetadata: {
					contentType: 'image/png',
				},
				customMetadata: {
					userId: interaction.member.user.id,
					submittedAt: new Date(getTimestamp(`${BigInt(interaction.id)}`)).toISOString(),
					// set date to last friday
					date:
						date ??
						(() => {
							// Get the current date
							const today = new Date();
							const dayOfWeek = today.getDay(); // 0-6 (Sun-Sat)

							// Calculate days to subtract to get to last Friday
							let daysToSubtract;
							if (dayOfWeek === 6) {
								// Saturday
								daysToSubtract = 1; // Go back 1 day to Friday
							} else if (dayOfWeek === 5) {
								// Today is Friday
								daysToSubtract = 7; // Go back a week to last Friday
							} else {
								// Sunday-Thursday
								daysToSubtract = dayOfWeek + 2; // Sunday(0)+2=2, Monday(1)+2=3, etc.
							}

							// Create date for last Friday
							const lastFriday = new Date();
							lastFriday.setDate(today.getDate() - daysToSubtract);

							// Format as dd/mm/yyyy
							const dd = String(lastFriday.getDate()).padStart(2, '0');
							const mm = String(lastFriday.getMonth() + 1).padStart(2, '0'); // January is 0!
							const yyyy = lastFriday.getFullYear();
							return `${dd}/${mm}/${yyyy}`;
						})(),
					userName: interaction.member.user.username,
				},
			});

			return messageResponse(`Image uploaded successfully: https://photos.fry.api.lisekilis.dev/${id}`, MessageFlags.Ephemeral);

		default:
			return messageResponse('Unknown subcommand', MessageFlags.Ephemeral);
	}
}
export async function handleViewCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	if (!interaction.data.options?.[0] || interaction.data.options[0].type !== ApplicationCommandOptionType.Subcommand)
		return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);

	switch (interaction.data.options[0].name) {
		case 'pillow':
			const list = (await env.FRY_PILLOWS.list({ include: ['customMetadata'] })) as PillowR2Objects;
			const pillowUserId = interaction.data.options[0].options?.find((option) => option.name === 'user')?.value as string;
			const pillowType = interaction.data.options[0].options?.find((option) => option.name === 'type')?.value as PillowType;

			// Get ID from parameters or select a random one if available
			let id;
			if (pillowUserId && pillowType) {
				id = `${pillowUserId}_${pillowType}`;
			} else {
				id = interaction.data.options[0].options?.find((option) => option.name === 'id')?.value as string;

				// If no ID provided, pick a random pillow
				if (!id && list.objects && list.objects.length > 0) {
					const randomIndex = Math.floor(Math.random() * list.objects.length);
					id = list.objects[randomIndex].key;
				}
			}

			// Fetch the pillow with the determined ID
			const pillow = id ? await env.FRY_PILLOWS.get(id) : null;
			if (!pillow) return messageResponse('Pillow not found', MessageFlags.Ephemeral);

			// Find the pillow object with matching key
			const pillowObject = list.objects.find((obj) => obj.key === id);
			if (!pillowObject) return messageResponse('Pillow metadata not found', MessageFlags.Ephemeral);

			const embed = {
				title: pillowObject.customMetadata?.name || `Unknown Pillow`,
				description: `${pillowObject.customMetadata?.userName}'s pillow ID: ${id}, submitted by <@${pillowObject.customMetadata?.userId}>`,
				image: {
					url: `https://pillows.fry.api.lisekilis.dev/${id}`,
				},
				fields: [
					{
						name: 'Submitted At',
						value: pillowObject.customMetadata?.submittedAt
							? `<t:${new Date(pillowObject.customMetadata.submittedAt).getTime() / 1000}:F>`
							: 'Unknown',
						inline: true,
					},
					{
						name: 'Approved by',
						value: pillowObject.customMetadata?.approverId ? `<@${pillowObject.customMetadata.approverId}>` : 'Unknown',
						inline: true,
					},
				],
				footer: {
					text: 'Click on the image to view the pillow',
				},
				color: 0x9469c9,
			};
			return embedResponse(embed, 'Pillow details', MessageFlags.Ephemeral);

		case 'photo':
			let photoId = interaction.data.options[0].options?.find((option) => option.name === 'id')?.value as string;

			// If no ID provided, pick a random photo
			if (!photoId) {
				const photoList = await env.FRY_PHOTOS.list({ include: ['customMetadata'] });

				if (photoList.objects && photoList.objects.length > 0) {
					const randomIndex = Math.floor(Math.random() * photoList.objects.length);
					photoId = photoList.objects[randomIndex].key;
				} else {
					return messageResponse('No photos found', MessageFlags.Ephemeral);
				}
			}

			const photo = await env.FRY_PHOTOS.get(photoId);
			if (!photo) return messageResponse('Photo not found', MessageFlags.Ephemeral);

			const photoEmbed = {
				title: 'Group Photo',
				description: `Photo ID: ${photoId}, submitted by <@${photo.customMetadata?.userId}>`,
				image: {
					url: `https://photos.fry.api.lisekilis.dev/${photoId}`,
				},
				fields: [
					{
						name: 'Submitted At',
						value: photo.customMetadata?.submittedAt
							? `<t:${Math.floor(new Date(photo.customMetadata.submittedAt).getTime() / 1000)}:F>`
							: 'Unknown',
						inline: true,
					},
					{
						name: 'Date',
						value: photo.customMetadata?.date || 'Unknown',
						inline: true,
					},
				],
				footer: {
					text: 'Click on the image to view the photo',
				},
				color: 0x9469c9,
			};
			return embedResponse(photoEmbed, 'Photo details', MessageFlags.Ephemeral);

		default:
			return messageResponse('Unknown subcommand', MessageFlags.Ephemeral);
	}
}
