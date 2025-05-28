import {
	APIComponentInContainer,
	APIInteractionResponseChannelMessageWithSource,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from 'discord-api-types/v10';
import { command, subcommand } from '.';
import { messageResponse } from '../responses';
import { PillowData, PillowType } from '../../types';

export default command({
	name: 'view',
	description: 'View a an image',
	type: ApplicationCommandType.ChatInput,
	subcommands: [
		subcommand({
			name: 'pillow',
			description: 'View a pillow',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'user',
					description: 'The user which pillow to view (shows all pillows if type is not specified)',
					type: ApplicationCommandOptionType.User,
				},
				{
					name: 'type',
					description: 'The type of pillow to view (only works with user)',
					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: PillowType.REGULAR,
							value: PillowType.REGULAR,
						},
						{
							name: PillowType.BODY,
							value: PillowType.BODY,
						},
					],
				},
				{
					name: 'id',
					description: 'The id of the pillow to view',
					type: ApplicationCommandOptionType.String,
				},
			],
			execute: async (interaction, env) => {
				// Basic check for subcommand structure
				if (interaction.data.options?.[0]?.type !== ApplicationCommandOptionType.Subcommand || !interaction.data.options[0].options) {
					return messageResponse('Invalid command structure.', MessageFlags.Ephemeral);
				}
				const subCommandOptions = interaction.data.options[0].options;

				const userOption = subCommandOptions.find((option) => option.name === 'user');
				const typeOption = subCommandOptions.find((option) => option.name === 'type');
				const idOption = subCommandOptions.find((option) => option.name === 'id');

				const userId = userOption?.value as string | undefined;
				const pillowType = typeOption?.value as PillowType | undefined;
				let pillowId = idOption?.value as string | undefined;

				// If user and type are provided, construct the ID. This takes precedence.
				if (userId && pillowType) {
					pillowId = `${userId}_${pillowType}`; // Pillow ID format is userId_PillowType
				}

				if (pillowId) {
					// Case 1: View a single pillow by ID (either direct ID or user+type)
					const pillowHead = await env.FRY_PILLOWS.head(pillowId);
					if (!pillowHead || !pillowHead.customMetadata) {
						return messageResponse('The pillow submission was not found or has no metadata.', MessageFlags.Ephemeral);
					}
					const pillowData = pillowHead.customMetadata as PillowData;

					const pillowUrl = `${env.PILLOW_URL}/${pillowId}`;
					const response: APIInteractionResponseChannelMessageWithSource = {
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: MessageFlags.IsComponentsV2,
							components: [
								{
									type: ComponentType.Container,
									accent_color: 0x9469c9,
									components: [
										{
											type: ComponentType.TextDisplay,
											content: `# Here's <@${pillowData.userId}>'s \`${pillowData.type}\` pillow "${pillowData.name}":`,
										},
										{
											type: ComponentType.MediaGallery,
											items: [
												{
													media: { url: pillowUrl },
													description: pillowData.name,
												},
											],
										},
										{
											type: ComponentType.Separator,
										},
										{
											type: ComponentType.TextDisplay,
											content:
												`- Submitted by ${pillowData.userName || `<@${pillowData.userId}>`} on <t:${Math.floor(
													new Date(pillowData.submittedAt).getTime() / 1000
												)}:F>\n` +
												`- Approved by <@${pillowData.approverId}> on <t:${Math.floor(
													new Date(pillowData.approvedAt).getTime() / 1000
												)}:F>\n` +
												`\n-# [Click here to view the pillow in your browser](${pillowUrl})`,
										},
									],
								},
							],
						},
					};
					return new Response(JSON.stringify(response), {
						headers: { 'Content-Type': 'application/json' },
					});
				} else if (userId) {
					// Case 2: View all pillows for a user (type was not provided, id was not directly provided)
					// Efficiently list pillows for the user using a prefix if keys are `${userId}_${type}`
					const listResult = await env.FRY_PILLOWS.list({ prefix: `${userId}_`, include: ['customMetadata'] });

					const userPillows = listResult.objects
						.filter((obj) => obj.customMetadata) // Ensure customMetadata exists
						.map((obj) => ({
							key: obj.key,
							data: obj.customMetadata as PillowData,
						}));

					if (userPillows.length === 0) {
						return messageResponse(`No pillows found for user <@${userId}>.`, MessageFlags.Ephemeral);
					}

					const displayContainerComponents: APIComponentInContainer[] = [];
					displayContainerComponents.push({
						type: ComponentType.TextDisplay,
						content: `# Pillows submitted by <@${userId}>: (${userPillows.length} found)`,
					});

					for (const pillow of userPillows) {
						const pillowUrl = `${env.PILLOW_URL}/${pillow.key}`;
						const { data: pillowData, key: currentPillowKey } = pillow;

						displayContainerComponents.push({ type: ComponentType.Separator });
						displayContainerComponents.push({
							type: ComponentType.TextDisplay,
							content: `## \`${pillowData.type}\` pillow: "${pillowData.name}"\n(ID: \`${currentPillowKey}\`)`,
						});
						displayContainerComponents.push({
							type: ComponentType.MediaGallery,
							items: [{ media: { url: pillowUrl }, description: pillowData.name }],
						});
						displayContainerComponents.push({
							type: ComponentType.TextDisplay,
							content:
								`- Submitted by ${pillowData.userName || `<@${pillowData.userId}>`} on <t:${Math.floor(
									new Date(pillowData.submittedAt).getTime() / 1000
								)}:F>\n` +
								`- Approved by <@${pillowData.approverId}> on <t:${Math.floor(new Date(pillowData.approvedAt).getTime() / 1000)}:F>\n` +
								`\n[View in browser](${pillowUrl})`,
						});
					}

					const response: APIInteractionResponseChannelMessageWithSource = {
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: MessageFlags.IsComponentsV2,
							components: [
								{
									type: ComponentType.Container,
									accent_color: 0x9469c9,
									components: displayContainerComponents,
								},
							],
						},
					};
					return new Response(JSON.stringify(response), {
						headers: { 'Content-Type': 'application/json' },
					});
				} else {
					// Case 3: Invalid combination or insufficient options
					return messageResponse(
						'Please specify a user to view all their pillows, a user and type for a specific pillow, or a full pillow ID.',
						MessageFlags.Ephemeral
					);
				}
			},
		}),
	],
});
