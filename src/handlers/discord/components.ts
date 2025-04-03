import {
	APIEmbed,
	APIMessageComponentButtonInteraction,
	APIMessageComponentInteraction,
	InteractionResponseType,
	MessageFlags,
	RESTPostAPIInteractionCallbackJSONBody,
	RESTPostAPIInteractionFollowupJSONBody,
	RouteBases,
	Routes,
} from 'discord-api-types/v10';
import { messageResponse } from './responses';
import { isGuildInteraction, isMessageComponentButtonInteraction } from 'discord-api-types/utils';
import { listPhotosEmbed, listPillowsEmbed, paginationButtons } from './util';
import { PhotoR2Objects, PillowR2Objects } from '../../types';

export async function handleMessageComponent(
	interaction: APIMessageComponentInteraction,
	env: Env,
	ctx: ExecutionContext
): Promise<Response> {
	if (!isMessageComponentButtonInteraction(interaction)) {
		return messageResponse('Only buttons are supported', MessageFlags.Ephemeral);
	}

	if (interaction.data.custom_id.startsWith('page')) return handlePaginationButtons(interaction, env, ctx);

	if (!isGuildInteraction(interaction)) {
		return messageResponse('This interaction is not in a guild', MessageFlags.Ephemeral);
	}

	if (!interaction.message.interaction_metadata?.user) {
		return messageResponse('This interaction has no user', MessageFlags.Ephemeral);
	}

	// Check if the user is a mod
	const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
	const parsedSettings = settings ? JSON.parse(settings) : {};

	if (!parsedSettings.modRoleId) {
		return messageResponse('No mod role set', MessageFlags.Ephemeral);
	}

	if (!interaction.member.roles.includes(parsedSettings.modRoleId)) {
		return messageResponse('Only image moderators are allowed to manage submissions', MessageFlags.Ephemeral);
	}

	const user = interaction.message.interaction_metadata.user;
	const message = interaction.message;
	const embed = message.embeds[0];
	const fields = embed.fields;

	if (!fields) {
		return messageResponse('Button Pressed!', MessageFlags.Ephemeral);
	}

	const pillowName = fields.find((field) => field.name === 'Name:')?.value;
	const pillowType = fields.find((field) => field.name === 'Type:')?.value;
	const pillowId = `${user.id}_${pillowType}`;

	if (!pillowName || !pillowType) {
		return messageResponse('The submission lacks a name or type', MessageFlags.Ephemeral);
	}

	const userName = embed.title?.split("'s Pillow Submission")[0];

	if (!userName) {
		return messageResponse('The submission lacks a user name', MessageFlags.Ephemeral);
	}

	switch (interaction.data.custom_id) {
		case 'approve':
			try {
				const pillow = await env.FRY_PILLOW_SUBMISSIONS.get(pillowId);
				if (!pillow) {
					return messageResponse('The pillow submission was not found', MessageFlags.Ephemeral);
				}

				const pillowData = await pillow.arrayBuffer();

				// Upload the pillow to the pillow bucket
				ctx.waitUntil(
					env.FRY_PILLOWS.put(pillowId, pillowData, {
						httpMetadata: pillow.httpMetadata,
						customMetadata: {
							...pillow.customMetadata,
							discordApproverId: interaction.member.user.id,
							submittedAt: pillow.uploaded.toISOString(),
						},
					}).catch((error) => {
						console.error('Error uploading pillow:', error);
					})
				);

				const pillowUrl = `https://pillows.fry.api.lisekilis.dev/${pillowId}`;

				ctx.waitUntil(
					env.FRY_PILLOW_SUBMISSIONS.delete(pillowId).catch((error) => {
						console.error('Error uploading pillow:', error);
					})
				);

				const newEmbedApprove = {
					...embed,
					image: {
						url: `attachment://${pillowId}.png`,
					},
					footer: {
						text: `Approved by ${interaction.member.user.username}`,
						icon_url: interaction.member.user.avatar
							? `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`
							: undefined,
						with_response: true,
					},
					timestamp: new Date().toISOString(),
				} as APIEmbed;
				// We need to ensure image URLs are valid and attachments are properly handled

				const approveResponse = await fetch(RouteBases.api + Routes.interactionCallback(interaction.id, interaction.token), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						type: InteractionResponseType.UpdateMessage,
						data: {
							content: '',
							embeds: [newEmbedApprove],
							components: [],
							attachments:
								interaction.message.attachments && interaction.message.attachments.length > 0 ? interaction.message.attachments : undefined,
						},
					} as RESTPostAPIInteractionCallbackJSONBody),
				});
				if (!approveResponse.ok) {
					console.error(`Error updating message: ${await approveResponse.text()}`);
					return messageResponse('An error occurred while updating the message', MessageFlags.Ephemeral);
				}

				const confirmResponse = await fetch(RouteBases.api + Routes.webhook(interaction.application_id, interaction.token), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						content: `Approved pillow submission: ${pillowName} (${pillowType}) by <@${interaction.message.interaction_metadata.user.id}>
						[View Pillow](${pillowUrl})`,
						flags: MessageFlags.Ephemeral,
					} as RESTPostAPIInteractionFollowupJSONBody),
				});

				if (!confirmResponse.ok) throw new Error(await confirmResponse.text());

				return new Response(undefined, { status: 202 });
			} catch (error) {
				console.error('Error in approve flow:', error);
				return messageResponse(
					`An error occurred while approving: ${error instanceof Error ? error.message : String(error)}`,
					MessageFlags.Ephemeral
				);
			}

		case 'deny':
			try {
				// delete the submission
				ctx.waitUntil(
					env.FRY_PILLOW_SUBMISSIONS.delete(pillowId).catch((error) => {
						console.error('Error uploading pillow:', error);
					})
				);

				const newEmbedDeny = {
					...embed,
					image: {
						url: `attachment://${pillowId}.png`,
					},
					footer: {
						text: `Denied by ${interaction.member.user.username}`,
						icon_url: interaction.member.user.avatar
							? `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`
							: undefined,
					},
					timestamp: new Date().toISOString(),
				} as APIEmbed;

				const denyResponse = await fetch(RouteBases.api + Routes.interactionCallback(interaction.id, interaction.token), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						type: InteractionResponseType.UpdateMessage,
						data: {
							content: '',
							embeds: [newEmbedDeny],
							components: [],
							attachments:
								interaction.message.attachments && interaction.message.attachments.length > 0 ? interaction.message.attachments : undefined,
						},
					} as RESTPostAPIInteractionCallbackJSONBody),
				});

				if (!denyResponse.ok) {
					console.error(`Error updating message: ${await denyResponse.text()}`);
					return messageResponse('An error occurred while updating the message', MessageFlags.Ephemeral);
				}

				const confirmDenyResponse = await fetch(RouteBases.api + Routes.webhook(interaction.application_id, interaction.token), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						content: `Denied pillow submission: ${pillowName} (${pillowType}) by <@${interaction.message.interaction_metadata.user.id}>`,
						flags: MessageFlags.Ephemeral,
					} as RESTPostAPIInteractionFollowupJSONBody),
				});

				if (!confirmDenyResponse.ok) throw new Error(await confirmDenyResponse.text());

				return new Response(undefined, { status: 202 });
			} catch (error) {
				console.error('Error in deny flow:', error);
				return messageResponse(
					`An error occurred while denying: ${error instanceof Error ? error.message : String(error)}`,
					MessageFlags.Ephemeral
				);
			}
		default:
			return messageResponse('Unknown button interaction', MessageFlags.Ephemeral);
	}
}

async function handlePaginationButtons(interaction: APIMessageComponentButtonInteraction, env: Env, ctx: ExecutionContext) {
	const user = interaction.message.interaction_metadata?.user;
	if (!user) return messageResponse('This interaction has no user', MessageFlags.Ephemeral);

	const embed = interaction.message.embeds[0];
	const type = embed.description?.split(' ').at(-1);
	const splitId = interaction.data.custom_id.split('-');
	const page = {
		next: Number(splitId[3]) + splitId[1] === 'next' ? 1 : -1,
		size: Number(splitId[2]),
		current: Number(splitId[3]),
		count: Number(splitId[4]),
	};

	if (page.next < 1 || page.next > page.count) return messageResponse('Invalid page number', MessageFlags.Ephemeral);

	const images =
		type === 'pillows'
			? await env.FRY_PILLOWS.list({ include: ['customMetadata'] })
			: await env.FRY_PHOTOS.list({ include: ['customMetadata'] });

	const newEmbed =
		type === 'pillows'
			? listPillowsEmbed(images as PillowR2Objects, page.next, page.size, page.count, images.objects.length)
			: listPhotosEmbed(images as PhotoR2Objects, page.next, page.size, page.count, images.objects.length);

	const newComponents = paginationButtons(page.size, page.next, page.count);

	const paginationResponse = await fetch(RouteBases.api + Routes.interactionCallback(interaction.id, interaction.token), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			type: InteractionResponseType.UpdateMessage,
			data: {
				content: interaction.message.content,
				embeds: [newEmbed],
				components: newComponents,
			},
		} as RESTPostAPIInteractionCallbackJSONBody),
	});

	if (!paginationResponse.ok) {
		console.error(`Error updating message: ${await paginationResponse.text()}`);
		return messageResponse('An error occurred while updating the message', MessageFlags.Ephemeral);
	}

	return new Response(undefined, { status: 202 });
}
