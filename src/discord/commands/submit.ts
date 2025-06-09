import {
	APIEmbed,
	APIEmbedField,
	APIInteractionResponseChannelMessageWithSource,
	APIInteractionResponseUpdateMessage,
	APIMessageTopLevelComponent,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	RouteBases,
	Routes,
} from 'discord-api-types/v10';
import { command, subcommand } from '.';
import { PillowData, PillowSubmissionData, PillowType, Settings } from '../../types';
import { isGuildInteraction } from 'discord-api-types/utils';
import { messageResponse } from '../responses';
import { parse } from 'path';
import { getDate, getTimestamp } from 'discord-snowflake';
import { stat } from 'fs';

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
							value: PillowType.REGULAR,
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
				console.log('submit.pillow interaction:', interaction);

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

				console.log('checks passed, proceeding with submission');

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

				console.log('Starging attachment download for:', attachment.url);

				const attachmentResponse = await fetch(attachment.url);
				if (!attachmentResponse.ok) return messageResponse('Failed to download the attachment', MessageFlags.Ephemeral);

				console.log('Attachment downloaded successfully:', attachment.url);

				const imageBuffer = attachmentResponse.arrayBuffer();

				const customMetadata: PillowSubmissionData = {
					userId,
					userName,
					name,
					type,
					submittedAt: new Date().toISOString(),
				};
				// upload the pillow to r2
				try {
					await env.FRY_PILLOW_SUBMISSIONS.put(`${interaction.member.user.id}_${type}`, await imageBuffer, {
						httpMetadata: {
							contentType: 'image/png',
						},
						customMetadata,
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

				console.log('Initiating submission to the pillow channel');

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
								accent_color: 0x9469c9,
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
												custom_id: `submit.pillow-approve-${userName}`,
											},
											{
												type: ComponentType.Button,
												style: ButtonStyle.Danger,
												label: 'Deny',
												custom_id: `submit.pillow-deny-${userName}`,
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
								description: name,
							},
						],
					},
				};
				console.log('Components prepared, creating response body');
				const responseBody = new FormData();

				responseBody.append('payload_json', JSON.stringify(response));
				const file = new Blob([await imageBuffer], { type: 'image/png' });
				console.log('Appending file to response body:', `${interaction.member.user.id}_${type}.png`);
				responseBody.append('files[0]', file, attachment.filename);
				return new Response(responseBody);
			},
			executeComponent: async (interaction, customId, env, ctx) => {
				console.log('executeComponent started', { interaction, customId });
				if (!isGuildInteraction(interaction)) return messageResponse('This command can only be used in a server', MessageFlags.Ephemeral);
				const parts = customId.split('-');
				const action = parts[0];
				const userName = parts.slice(1).join('-');
				console.log('Parsed customId parts:', { action, userName });

				const item = interaction.message.components
					?.find((component) => component.type === ComponentType.Container)
					?.components.find((component) => component.type === ComponentType.MediaGallery)?.items[0];
				if (!item || !item.media || !item.media.url || !item.description) {
					console.error('Image item or its properties not found in submission', { item });
					return messageResponse('No image found in the submission', MessageFlags.Ephemeral);
				}
				const name = item.description as string;
				const type = item.media.url.toString().split('/').pop()?.split('_')[1].split('.png')[0] as PillowType;
				console.log('Extracted item details:', { name, type });
				const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
				const parsedSettings = settings ? (JSON.parse(settings) as Settings) : {};
				console.log('Parsed settings:', parsedSettings);

				if (!parsedSettings.modRoleId)
					return messageResponse(
						'The image moderator role has not been configured. Please ask an admin to set it up.',
						MessageFlags.Ephemeral
					);
				if (!interaction.member.roles.includes(parsedSettings.modRoleId))
					return messageResponse('Only image moderators are allowed to manage submissions', MessageFlags.Ephemeral);

				if (!interaction.message.interaction_metadata || !interaction.message.interaction_metadata.user) {
					console.error('Interaction metadata or user not found');
					return messageResponse('This interaction has no user', MessageFlags.Ephemeral);
				}

				const userId = interaction.message.interaction_metadata.user.id;
				const pillowId = `${userId}_${type}`;
				console.log('User ID and Pillow ID:', { userId, pillowId });

				console.log('Retrieving pillow image from R2 with ID:', pillowId);

				const pillowHead = await env.FRY_PILLOW_SUBMISSIONS.head(pillowId);
				if (!pillowHead) {
					console.error('Pillow not found in R2:', pillowId);
					return messageResponse('Pillow not found in storage', MessageFlags.Ephemeral);
				}
				const pillowPromise = env.FRY_PILLOW_SUBMISSIONS.get(pillowId);

				console.log('Preparing to process action:', action);
				let components: APIMessageTopLevelComponent[];
				switch (action) {
					case 'approve':
						console.log('Processing approve action');
						const customMetadata: PillowData = {
							...((await pillowPromise)!.customMetadata as PillowSubmissionData),
							approverId: interaction.member.user.id,
							approvedAt: new Date().toISOString(),
						};
						console.log('Custom metadata for R2:', customMetadata);
						try {
							console.log('Uploading pillow to R2 with ID:', pillowId);
							await env.FRY_PILLOWS.put(pillowId, (await pillowPromise)!.body, {
								httpMetadata: {
									contentType: 'image/png',
								},
								customMetadata,
							});
							console.log('Pillow uploaded to R2 successfully');
							env.FRY_PILLOW_SUBMISSIONS.delete(pillowId);
						} catch (error) {
							console.error('R2 upload error:', error);
							return messageResponse(
								`Failed to upload image to storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
								MessageFlags.Ephemeral
							);
						}
						components = interaction.message.components!.map((component) => {
							if (component.type === ComponentType.Container)
								return {
									type: ComponentType.Container,
									accent_color: 0x9469c9,
									components: component.components.map((subComponent) => {
										switch (subComponent.type) {
											case ComponentType.MediaGallery:
												return {
													type: ComponentType.MediaGallery,
													items: [
														{
															media: { url: `attachment://${userId}_${type}.png` },
															description: name,
														},
													],
												};
											case ComponentType.ActionRow:
												return {
													type: ComponentType.TextDisplay,
													content: `-# submission approved by <@${interaction.member.user.id}> | <t:${getDate(
														`${BigInt(interaction.id)}`
													).getSeconds()}:f>`,
												};
											default:
												return subComponent;
										}
									}),
								};
							return component;
						});
						try {
							await fetch(RouteBases.api + Routes.interactionCallback(interaction.application_id, interaction.token), {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									type: InteractionResponseType.UpdateMessage,
									data: {
										flags: MessageFlags.IsComponentsV2,
										components,
										attachments: [
											{
												id: '0',
												filename: `${userId}_${type}.png`,
											},
										],
									},
								}),
							})
								.then((res) => {
									console.log('Message update API response:', res);
									return res.json();
								})
								.catch(() => {
									console.error('Failed to update message');
									return messageResponse('Failed to update the submission message', MessageFlags.Ephemeral);
								});
							console.log('Message updated successfully for approval.');
						} catch (error) {
							console.error('Error in approve flow:', error);
							return messageResponse(
								`An error occurred while approving: ${error instanceof Error ? error.message : String(error)}`,
								MessageFlags.Ephemeral
							);
						}
						console.log('Approve action completed');
						return messageResponse(
							`Approved pillow submission: ${name} (${type}) by <@${interaction.message.interaction_metadata.user.id}>`,
							MessageFlags.Ephemeral
						);

					case 'deny':
						console.log('Processing deny action');
						components = interaction.message.components!.map((component) => {
							if (component.type === ComponentType.Container)
								return {
									type: ComponentType.Container,
									accent_color: 0x9469c9,
									components: component.components.map((subComponent) => {
										switch (subComponent.type) {
											case ComponentType.MediaGallery:
												return {
													type: ComponentType.MediaGallery,
													items: [
														{
															media: { url: `attachment://${userId}_${type}.png` },
															description: name,
															spoiler: true,
														},
													],
												};
											case ComponentType.TextDisplay:
												return {
													type: ComponentType.TextDisplay,
													content: `-# Submission denied by <@${interaction.member.user.id}> | <t:${getDate(
														`${BigInt(interaction.id)}`
													).getSeconds()}:f>`,
												};
											default:
												return subComponent;
										}
									}),
								};

							return component;
						});
						try {
							console.log('Updating message components for denial', components);
							const updateResponse = await fetch(
								RouteBases.api + Routes.interactionCallback(interaction.application_id, interaction.token),
								{
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
									},
									body: JSON.stringify({
										type: InteractionResponseType.UpdateMessage,
										data: {
											flags: MessageFlags.IsComponentsV2,
											components,
											attachments: [
												{
													id: '0',
													filename: `${userId}_${type}.png`,
												},
											],
										},
									}),
								}
							);

							console.log('Message update API response status:', updateResponse.status);
							if (!updateResponse.ok) {
								const errorBody = await updateResponse.json().catch(() => ({ message: 'Failed to parse error response from API' }));
								console.error('Failed to update message, API error:', errorBody);
								throw new Error(
									`Failed to update submission message. API responded with ${updateResponse.status}: ${JSON.stringify(errorBody)}`
								);
							}
							console.log('Message updated successfully for denial.');
						} catch (error) {
							console.error('Error in deny flow:', error);
							return messageResponse(
								`An error occurred while denying: ${error instanceof Error ? error.message : String(error)}`,
								MessageFlags.Ephemeral
							);
						}
						ctx.waitUntil(env.FRY_PILLOW_SUBMISSIONS.delete(pillowId));
						console.log('Deny action completed');
						return messageResponse(`Denied pillow submission: ${name} (${type})`, MessageFlags.Ephemeral);
					default:
						console.log('executeComponent finished, no action taken or unknown action:', { action });
						return messageResponse('Unknown action', MessageFlags.Ephemeral);
				}
			},
		}),
	],
});
