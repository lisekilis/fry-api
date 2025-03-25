import { APIMessage, APIMessageComponentInteraction, ImageFormat, MessageFlags, MessageType } from 'discord-api-types/v10';
import { messageResponse } from './responses';
import { isGuildInteraction, isMessageComponentButtonInteraction } from 'discord-api-types/utils';

export async function handleMessageComponent(interaction: APIMessageComponentInteraction, env: Env): Promise<Response> {
	if (!isMessageComponentButtonInteraction(interaction)) {
		return messageResponse('Only buttons are supported', MessageFlags.Ephemeral);
	}

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

	if (!pillowName || !pillowType) {
		return messageResponse('The submission lacks a name or type', MessageFlags.Ephemeral);
	}

	const userName = embed.title?.split("'s Pillow Submission")[0];

	if (!userName) {
		return messageResponse('The submission lacks a user name', MessageFlags.Ephemeral);
	}

	switch (interaction.data.custom_id) {
		case 'approve':
			// fetch the message
			if (!embed.image || !embed.image.url)
				return messageResponse('The submission lacks attachments, how bizarre!', MessageFlags.Ephemeral);
			const messageReResponse = await fetch(
				`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${interaction.token}/messages/@original`
			);
			if (!messageReResponse.ok) {
				console.error(`Error fetching message: ${messageReResponse.status} - ${await messageReResponse.text()}`);
				return messageResponse(`Failed to fetch the message (${messageReResponse.status})`, MessageFlags.Ephemeral);
			}
			const newMessage = (await messageReResponse.json()) as APIMessage;
			if (!newMessage.embeds) return messageResponse('The new message lacks an embed', MessageFlags.Ephemeral);
			if (!newMessage.embeds[0].image?.url) return messageResponse('The new message lacks an image attachment', MessageFlags.Ephemeral);
			const newURL = newMessage.embeds[0].image?.url;
			if (!newURL) return messageResponse('Failed to get a new texture URL', MessageFlags.Ephemeral);
			console.log(newURL);
			// fetch attachment image
			const textureResponse = await fetch(newURL);

			if (!textureResponse.ok) {
				console.error(`Error fetching texture: ${textureResponse.status} - ${await textureResponse.text()}`);
				return messageResponse(`Failed to fetch the texture (${textureResponse.status})`, MessageFlags.Ephemeral);
			}

			// Use the body stream directly
			const texture = textureResponse.body;
			if (!texture) {
				return messageResponse('Failed to fetch the texture', MessageFlags.Ephemeral);
			}

			await env.FRY_PILLOWS.put(`${user}_${pillowType}`, texture, {
				httpMetadata: {
					contentType: 'image/png',
				},
				customMetadata: {
					discordUserId: user.id,
					discordApproverId: interaction.member.user.id,
					submittedAt: interaction.message.timestamp,
					pillowName,
					pillowType,
					userName,
				},
			});

			const newEmbed = {
				...embed,
				image: {
					url: `https://pillows.fry.api.lisekilis.dev/${user.id}_${pillowType}`,
				},
				footer: {
					text: `Approved by <@${interaction.member.user.id}>`,
					icon_url: `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`,
				},
				timestamp: new Date().toISOString(),
			};

			const response = await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${interaction.token}/messages/@original`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					embeds: [newEmbed],
					components: [],
					attachments: [
						{
							id: interaction.message.attachments[0].id,
						},
					],
				}),
			});
			console.log(await response.text());
			if (!response.ok) {
				console.error(`Error updating message: ${await response.text()}`);
			}

			console.log(`Approving pillow submission: ${pillowName} (${pillowType}) by ${userName}`);

			return messageResponse(`Approved pillow submission: ${pillowName} (${pillowType}) by <@${user.id}>`, MessageFlags.Ephemeral);

		case 'deny':
			const newEmbedDeny = {
				...embed,
				footer: {
					text: `Denied by <@${interaction.member.user.id}>`,
					icon_url: `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`,
				},
				timestamp: new Date().toISOString(),
			};

			const denyResponse = await fetch(
				`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${interaction.token}/messages/@original`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						embeds: [newEmbedDeny],
						components: [],
						attachments: [
							{
								id: interaction.message.attachments[0].id,
							},
						],
					}),
				}
			);

			if (!denyResponse.ok) {
				console.error(`Error updating message: ${await denyResponse.text()}`);
			}

			console.log(`Denied pillow submission: ${pillowName} (${pillowType}) by ${userName}`);

			return messageResponse(
				`Denied pillow submission: ${pillowName} (${pillowType}) by <@${interaction.message.interaction_metadata.user.id}>`,
				MessageFlags.Ephemeral
			);

		default:
			return messageResponse('Unknown button interaction', MessageFlags.Ephemeral);
	}
}
