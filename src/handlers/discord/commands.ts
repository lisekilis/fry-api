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
import { PillowType } from '../../types';
import { patchSettings } from '../settingsHandlers';
import { getTimestamp } from 'discord-snowflake';

export function handlePingCommand(interaction: APIChatInputApplicationCommandGuildInteraction): Response {
	const startTime = getTimestamp(`${BigInt(interaction.id)}`);
	const endTime = Date.now();
	const ping = endTime - startTime;

	return messageResponse(`🏓Pong! (${ping}ms)`);
}

export async function handleConfigCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
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

export async function handleSubmissions(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
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

				// Get pillow details
				const nameOption = subcommand.options?.find((option) => option.name === 'name');
				const typeOption = subcommand.options?.find((option) => option.name === 'type');
				const textureOption = subcommand.options?.find((option) => option.name === 'texture');
				const usernameOption = subcommand.options?.find((option) => option.name === 'username');

				if (!nameOption || !typeOption || !textureOption) {
					return messageResponse('Missing required options', MessageFlags.Ephemeral);
				}

				const pillowName = nameOption.value as string;
				const pillowType = typeOption.value as PillowType;
				const textureId = textureOption.value as string;
				const username = (usernameOption?.value as string) || interaction.member.user.username;

				// Get the attached texture
				const texture = interaction.data.resolved?.attachments?.[textureId];
				if (!texture) {
					return messageResponse('Texture attachment not found', MessageFlags.Ephemeral);
				}

				// Validate texture is png
				if (!texture.content_type?.includes('png')) {
					return messageResponse('Texture must be a PNG image', MessageFlags.Ephemeral);
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
						value: pillowType === PillowType.NORMAL ? 'Standard' : 'Dakimakura',
						inline: true,
					},
				];

				const embed: APIEmbed = {
					title: `${username}'s Pillow Submission`,
					description: `A new pillow submission has been received from <@${interaction.member.user.id}>`,
					color: 0x00ff00,
					fields,
					image: {
						url: texture.url,
					},
					timestamp: new Date().toISOString(),
					footer: {
						text: `Submitted by ${interaction.member.user.username}`,
						icon_url: `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`,
					},
				};

				// Post to the submissions channel
				const webhookResponse = await fetch(`https://discord.com/api/v10/channels/${parsedSettings.pillowChannelId}/messages`, {
					method: 'POST',
					headers: {
						Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						embeds: [embed],
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										style: ButtonStyle.Success,
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
					}),
				});

				if (!webhookResponse.ok) {
					console.error(`Failed to post submission: ${await webhookResponse.text()}`);
					return messageResponse('Failed to submit pillow design', MessageFlags.Ephemeral);
				}

				return messageResponse(
					`Your pillow design "${pillowName}" has been submitted for approval. You'll be notified when it's approved.`,
					MessageFlags.Ephemeral
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
