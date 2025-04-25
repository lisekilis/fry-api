import {
	APIEmbed,
	APIEmbedField,
	APIInteractionResponseCallbackData,
	APIInteractionResponseChannelMessageWithSource,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	RESTPostAPIInteractionCallbackJSONBody,
} from 'discord-api-types/v10';
import { command, subcommand } from '.';
import { PillowType, Settings } from '../../types';
import { isGuildInteraction } from 'discord-api-types/utils';
import { embedResponse, messageResponse } from '../responses';

export default command({
	name: 'submit',
	description: 'Make a new submission',
	type: ApplicationCommandType.ChatInput,
	subcommands: [
		subcommand({
			name: 'pillow',
			description: 'Submit your pillow design',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'texture',
					type: ApplicationCommandOptionType.Attachment,
					description: 'The texture for your pillow (png)',
					required: true,
				},
				{
					name: 'name',
					type: ApplicationCommandOptionType.String,
					description: 'Name for your pillow',
					required: true,
				},
				{
					name: 'type',
					type: ApplicationCommandOptionType.String,
					description: 'Type of pillow',
					choices: [
						{
							name: 'Standard',
							value: PillowType.NORMAL,
						},
						{
							name: 'Dakimakura',
							value: PillowType.BODY,
						},
					],
					required: true,
				},
				{
					name: 'username',
					type: ApplicationCommandOptionType.String,
					description: 'Override, defaults to your username',
				},
			],
			execute: async (interaction, env) => {
				if (!isGuildInteraction(interaction)) return messageResponse('This command can only be used in a server', MessageFlags.Ephemeral);

				const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
				const parsedSettings = settings ? (JSON.parse(settings) as Settings) : {};

				if (!parsedSettings.name) return messageResponse('This command can only be used in the whitelisted server', MessageFlags.Ephemeral);
				if (!parsedSettings.modRoleId)
					return messageResponse(
						'The image moderator role has not been configured. Please ask an admin to set it up.',
						MessageFlags.Ephemeral
					);
				if (!parsedSettings.pillowChannelId)
					return messageResponse(
						'The pillow submissions channel has not been configured. Please ask an admin to set it up.',
						MessageFlags.Ephemeral
					);

				if (parsedSettings.cooldown) {
					const cooldown = await env.FRY_COOLDOWN.get(interaction.member.user.id);
					if (cooldown) return messageResponse(`You are on cooldown for ${parsedSettings.cooldown} seconds`, MessageFlags.Ephemeral);
					await env.FRY_COOLDOWN.put(interaction.member.user.id, 'true', { expirationTtl: parsedSettings.cooldown * 1000 });
				}

				const subcommand = interaction.data.options[0];
				const nameOption = subcommand.options?.find((option) => option.name === 'name');
				const typeOption = subcommand.options?.find((option) => option.name === 'type');
				const textureOption = subcommand.options?.find((option) => option.name === 'texture');
				const usernameOption = subcommand.options?.find((option) => option.name === 'username');

				if (!nameOption || !typeOption || !textureOption) return messageResponse('Missing required options', MessageFlags.Ephemeral);

				const userName = (usernameOption?.value as string) || interaction.member.user.username;
				const type = typeOption.value as PillowType;
				const name = nameOption.value as string;

				const attachment = interaction.data.resolved?.attachments?.[textureOption.value as string];
				if (!attachment) return messageResponse('Texture attachment not found', MessageFlags.Ephemeral);
				if (!attachment.content_type?.includes('png')) return messageResponse('Texture must be a PNG image', MessageFlags.Ephemeral);

				const attachmentResponse = await fetch(attachment.url);
				if (!attachmentResponse.ok) return messageResponse('Failed to download the attachment', MessageFlags.Ephemeral);

				const imageBuffer = await attachmentResponse.arrayBuffer();

				// upload the pillow to r2
				try {
					await env.FRY_PILLOW_SUBMISSIONS.put(`${interaction.member.user.id}_${type}`, imageBuffer, {
						httpMetadata: {
							contentType: 'image/png',
						},
						customMetadata: {
							userId: interaction.member.user.id,
							userName,
							name,
							type,
						},
					});
				} catch (error) {
					console.error('R2 upload error:', error);
					return messageResponse(
						`Failed to upload image to storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
						MessageFlags.Ephemeral
					);
				}

				// Post to the submissions channel

				const response: APIInteractionResponseChannelMessageWithSource = {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: MessageFlags.IsComponentsV2,
						attachments: [
							{
								id: '0',
								filename: `${interaction.member.user.id}_${type}.png`,
							},
						],
					},
				};
				return new Response(JSON.stringify(response), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			},
		}),
	],
});

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
