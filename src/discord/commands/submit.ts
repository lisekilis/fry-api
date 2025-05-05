import {
	APIEmbed,
	APIEmbedField,
	APIInteractionResponseChannelMessageWithSource,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from 'discord-api-types/v10';
import { command, subcommand } from '.';
import { PillowType, Settings } from '../../types';
import { isGuildInteraction } from 'discord-api-types/utils';
import { messageResponse } from '../responses';
import { parse } from 'path';

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
				const userId = interaction.member.user.id;

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
							userId,
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

				// Submission flavor text
				const pillowText = [
					`Pillow just landed! Courtesy of <@${userId}>.`,
					`Soft and squishy incoming! New pillow submission.`,
					`Pillow magic happening thanks to <@${userId}>!`,
					`A delightful new pillow has surfaced.`,
					`Get your comfy on! New pillow alert.`,
					`Pillow vibes are strong with this new submission.`,
					`Look what just rolled in... a pillow!`,
					`Freshly baked pillow, straight from <@${userId}>'s oven!`,
					`This pillow submission is brought to you by <@${userId}>.`,
					`Snuggle up! A new pillow has arrived on the scene.`,
					`The pillow gods have smiled upon us!`,
					`Another fantastic pillow joins the collection.`,
					`Feast your eyes on this brand-new pillow!`,
					`<@${userId}> is on a roll! Pillow edition.`,
					`This pillow submission is pure comfort.`,
					`Brace yourselves... a new pillow is here!`,
					`We've got a soft spot for this new pillow.`,
					`Take a peek at the latest pillow creation!`,
					`Pillow power hour, initiated by <@${userId}>!`,
					`A fluffy friend has arrived, thanks to <@${userId}>.`,
					`New pillow unlocked!`,
					`Achievement unlocked: Pillow Submission by <@${userId}>.`,
					`Warning: May cause extreme comfort. New pillow detected.`,
					`You've got mail! ...and it's a pillow!`,
					`Guess what? New pillow!`,
					`A wild pillow appears!`,
					`Fresh pillow just dropped by <@${userId}>!`,
					`Look what the cat dragged in... a new pillow!`,
					`Pillow alert! <@${userId}> has blessed us.`,
					`A comfy challenger approaches!`,
					`Someone's been busy! New pillow submission.`,
					`Pillow power activated by <@${userId}>!`,
					`Get ready to fluff! A pillow has arrived.`,
					`The pillow parade continues! Thanks, <@${userId}>!`,
					`Another one! Pillow submission incoming.`,
					`May the fluff be with you. New pillow from <@${userId}>.`,
					`*squish* A new pillow has entered the arena!`,
					`Behold! The latest pillow creation.`,
					`A brand new pillow for your viewing pleasure.`,
					`<@${userId}> strikes again! This time with a pillow.`,
					`The fluff is real! New pillow submission.`,
					`Prepare for maximum comfort! A pillow is here.`,
					`We've got a new pillow in the house!`,
					`Check out this fresh pillow submission!`,
					`Pillow time! Thanks to <@${userId}>.`,
					`A soft new addition from <@${userId}>.`,
				];

				// Post to the submissions channel
				const response: APIInteractionResponseChannelMessageWithSource = {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: MessageFlags.IsComponentsV2,
						components: [
							{
								type: ComponentType.TextDisplay,
								content: pillowText[Math.floor(Math.random() * pillowText.length)],
							},
							{
								type: ComponentType.Container,
								components: [
									{
										type: ComponentType.TextDisplay,
										content: `# <@${userId}>'s Pillow Submission`,
									},
									{
										type: ComponentType.MediaGallery,
										items: [
											{
												media: { url: `attachment://${userId}_${type}.png` },
												description: name,
											},
										],
									},
									{
										type: ComponentType.TextDisplay,
										content: `### **Name:** ${name} | **Type:** ${type}`,
									},
									{
										type: ComponentType.Separator,
									},
									{
										type: ComponentType.ActionRow,
										components: [
											{
												type: ComponentType.Button,
												style: ButtonStyle.Primary,
												label: 'Approve',
												custom_id: `submit.pillow-approve-${type}-${name}-${userName}`,
											},
											{
												type: ComponentType.Button,
												style: ButtonStyle.Danger,
												label: 'Deny',
												custom_id: `submit.pillow-deny-${type}-${name}-${userName}`,
											},
										],
									},
								],
							},
						],
						attachments: [
							{
								id: '0',
								filename: `${interaction.member.user.id}_${type}.png`,
							},
						],
					},
				};
				const responseBody = new FormData();

				responseBody.append('payload_json', JSON.stringify(response));
				const file = new Blob([imageBuffer], { type: 'image/png' });
				responseBody.append('files[0]', file, `${interaction.member.user.id}_${type}.png`);

				return new Response(responseBody, {
					status: 200,
					headers: { 'Content-Type': 'multipart/form-data' },
				});
			},
			executeComponent: async (interaction, customId, env) => {
				if (!isGuildInteraction(interaction)) return messageResponse('This command can only be used in a server', MessageFlags.Ephemeral);
				const [action, type, name, userName] = customId.split('-');
				const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
				const parsedSettings = settings ? (JSON.parse(settings) as Settings) : {};

				if (!parsedSettings.modRoleId)
					return messageResponse(
						'The image moderator role has not been configured. Please ask an admin to set it up.',
						MessageFlags.Ephemeral
					);
				if (!interaction.member.roles.includes(parsedSettings.modRoleId))
					return messageResponse('Only image moderators are allowed to manage submissions', MessageFlags.Ephemeral);

				if (!interaction.message.interaction_metadata || !interaction.message.interaction_metadata.user)
					return messageResponse('This interaction has no user', MessageFlags.Ephemeral);

				const pillowId = `${interaction.message.interaction_metadata?.user.id}_${type}`;

				const pillow = await env.FRY_PILLOW_SUBMISSIONS.get(pillowId);
				if (!pillow) return messageResponse('Pillow not found', MessageFlags.Ephemeral);
				if (action === 'approve') {
				}

				return messageResponse('This command can only be used in a server', MessageFlags.Ephemeral);
			},
		}),
	],
});
