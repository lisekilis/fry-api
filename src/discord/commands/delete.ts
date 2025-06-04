import {
	APIComponentInContainer,
	APIInteractionResponseChannelMessageWithSource,
	APIInteractionResponseUpdateMessage,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from 'discord-api-types/v10';
import { command, subcommand } from '.';
import { messageResponse } from '../responses';
import { PillowType, Settings } from '../../types';
import { verifyMod } from '../util';
import list from './list';

export default command({
	name: 'delete',
	description: 'Delete an image',
	type: ApplicationCommandType.ChatInput,
	subcommands: [
		subcommand({
			name: 'pillow',
			description: 'Delete a pillow',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'user',
					description: 'The user who owns the pillow',
					type: ApplicationCommandOptionType.User,
					required: false,
				},
				{
					name: 'type',
					description: 'The type of pillow to delete (requires user to be specified)',
					type: ApplicationCommandOptionType.String,
					required: false,
					choices: [
						{ name: PillowType.REGULAR, value: PillowType.REGULAR },
						{ name: PillowType.BODY, value: PillowType.BODY },
					],
				},
				{
					name: 'name',
					description: 'The name of the pillow to delete',
					type: ApplicationCommandOptionType.String,
					required: false,
				},
				{
					name: 'id',
					description: 'The ID of the pillow to delete, skips search if specified',
					type: ApplicationCommandOptionType.String,
					required: false,
				},
			],
			execute: async (interaction, env, ctx) => {
				const modCheck = await verifyMod(interaction, env);
				if (modCheck) return modCheck;

				let id = interaction.data.options[0].options?.find((option) => option.name === 'id')?.value as string | undefined;
				const user = interaction.data.options[0].options?.find((option) => option.name === 'user')?.value as string | undefined;
				const type = interaction.data.options[0].options?.find((option) => option.name === 'type')?.value as PillowType | undefined;
				if (!id && user && type) id = `${user}-${type}`;
				if (!id) {
					const name = interaction.data.options[0].options?.find((option) => option.name === 'name')?.value as string | undefined;

					if (!user && !type && !name) {
						return messageResponse(
							'You must specify at least one of `id`, `user`, `type`, or `name` to delete a pillow.',
							MessageFlags.Ephemeral
						);
					}
					let pillows;
					if (user) {
						if (!type) {
							return messageResponse('You must specify a type when specifying a user.', MessageFlags.Ephemeral);
						}
						pillows = await env.FRY_PILLOWS.list({
							prefix: user,
						});
					} else if (name) {
						pillows = await env.FRY_PILLOWS.list({
							prefix: name,
						});
					} else {
						return messageResponse('You must specify either a user or a name to delete a pillow.', MessageFlags.Ephemeral);
					}
					if (pillows.objects.length === 0) {
						return messageResponse('No pillows found matching the criteria.', MessageFlags.Ephemeral);
					}
					if (pillows.objects.length > 1) {
						return await listItems(pillows, env.PILLOW_URL, 'pillow');
					}
					id = pillows.objects[0].key;
				}
				return await confirmDelete(id, env.FRY_PILLOWS, env.PILLOW_URL, 'pillow');
			},
			executeComponent: async (interaction, customId, env, ctx) => {
				const [action, id] = customId.split('-');
				switch (action) {
					case 'confirm':
						if (!id) return messageResponse('No ID provided for deletion.', MessageFlags.Ephemeral);
						try {
							await deleteItem(id, env.FRY_PILLOWS);
							return {
								type: InteractionResponseType.UpdateMessage,
								data: {
									flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
									content: `The pillow with ID \`${id}\` has been deleted.`,
									components: [],
								},
							};
						} catch (error) {
							console.error(`Failed to delete pillow with ID: ${id}`, error);
							return messageResponse(
								`Failed to delete the pillow: ${error instanceof Error ? error.message : 'Unknown error'}`,
								MessageFlags.Ephemeral
							);
						}
					case 'cancel':
						return {
							type: InteractionResponseType.UpdateMessage,
							data: {
								flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
								content: 'This action has been cancelled.',
								components: [],
							},
						};
					case 'select':
						if (!id) return messageResponse('No ID provided for selection.', MessageFlags.Ephemeral);
						let response = (await confirmDelete(
							id,
							env.FRY_PILLOWS,
							env.PILLOW_URL,
							'pillow'
						)) as unknown as APIInteractionResponseUpdateMessage;
						response.type = InteractionResponseType.UpdateMessage;
						return response;
					default:
						return messageResponse('How did we get here?', MessageFlags.Ephemeral);
				}
			},
		}),
		subcommand({
			name: 'photo',
			description: 'Delete a photo',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'id',
					description: 'The ID of the photo to delete, skips search if specified',
					type: ApplicationCommandOptionType.String,
					required: false,
				},
			],
			execute: async (interaction, env, ctx) => {
				const id = interaction.data.options[0].options?.find((option) => option.name === 'id')?.value as string | undefined;
				if (!id) {
					const photos = await env.FRY_PHOTOS.list();
					if (photos.objects.length === 0) {
						return messageResponse('No photos found.', MessageFlags.Ephemeral);
					}
					if (photos.objects.length > 1) {
						return await listItems(photos, env.PHOTO_URL, 'photo');
					}
					return await confirmDelete(photos.objects[0].key, env.FRY_PHOTOS, env.PHOTO_URL, 'photo');
				}
				return await confirmDelete(id, env.FRY_PHOTOS, env.PHOTO_URL, 'photo');
			},
			executeComponent: async (interaction, customId, env, ctx) => {
				const [action, id] = customId.split('-');
				switch (action) {
					case 'confirm':
						if (!id) return messageResponse('No ID provided for deletion.', MessageFlags.Ephemeral);
						try {
							await deleteItem(id, env.FRY_PHOTOS);
							return {
								type: InteractionResponseType.UpdateMessage,
								data: {
									flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
									content: `The photo with ID \`${id}\` has been deleted.`,
									components: [],
								},
							};
						} catch (error) {
							console.error(`Failed to delete photo with ID: ${id}`, error);
							return messageResponse(
								`Failed to delete the photo: ${error instanceof Error ? error.message : 'Unknown error'}`,
								MessageFlags.Ephemeral
							);
						}
					case 'cancel':
						return {
							type: InteractionResponseType.UpdateMessage,
							data: {
								flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
								content: 'This action has been cancelled.',
								components: [],
							},
						};
					case 'select':
						if (!id) return messageResponse('No ID provided for selection.', MessageFlags.Ephemeral);
						let response = (await confirmDelete(
							id,
							env.FRY_PHOTOS,
							env.PHOTO_URL,
							'photo'
						)) as unknown as APIInteractionResponseUpdateMessage;
						response.type = InteractionResponseType.UpdateMessage;
						return response;
					default:
						return messageResponse('How did we get here?', MessageFlags.Ephemeral);
				}
			},
		}),
	],
});

async function confirmDelete(
	id: string,
	bucket: R2Bucket,
	url: string,
	commandName: string
): Promise<APIInteractionResponseChannelMessageWithSource> {
	const item = await bucket.head(id);
	if (!item || !item.customMetadata) return messageResponse('The item was not found or has no metadata.', MessageFlags.Ephemeral);
	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: `Are you sure you want to delete this ${commandName}? This action cannot be undone.`,
				},
				{
					type: ComponentType.Container,
					accent_color: 0xf04847,
					components: [
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: `${url}/${id}`,
									},
									description: item.customMetadata.name ?? id,
								},
							],
						},
						{
							type: ComponentType.TextDisplay,
							content: `Metadata:\n\`\`\`ts\n${JSON.stringify(item.customMetadata, null, 2)}\`\`\``,
						},
						{
							type: ComponentType.Separator,
						},
						{
							type: ComponentType.TextDisplay,
							content: `ID: \`${id}\`\nThis will delete the ${commandName} permanently.`,
						},
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									style: ButtonStyle.Danger,
									label: 'Delete',
									custom_id: `delete-${commandName}-confirm-${id}`,
								},
								{
									type: ComponentType.Button,
									style: ButtonStyle.Secondary,
									label: 'Cancel',
									custom_id: `delete-${commandName}-cancel`,
								},
							],
						},
					],
				},
			],
		},
	};
}

async function deleteItem(id: string, bucket: R2Bucket): Promise<void> {
	try {
		await bucket.delete(id);
		console.log(`Deleted item with ID: ${id}`);
	} catch (err) {
		console.error(`Failed to delete item with ID: ${id}`, err);
		throw err; // Re-throw the error so the caller can handle it
	}
}

async function listItems(list: R2Objects, url: string, item: 'pillow' | 'photo'): Promise<APIInteractionResponseChannelMessageWithSource> {
	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: `Found ${list.objects.length} items.`,
				},
				{
					type: ComponentType.Container,
					accent_color: 0x9469c9,
					components: list.objects.map((Object) => {
						return {
							type: ComponentType.Section,
							accessory: {
								type: ComponentType.Button,
								style: ButtonStyle.Secondary,
								label: 'Select',
								custom_id: `delete.${item}-select-${Object.key}`,
							},
							components: [
								{
									type: ComponentType.TextDisplay,
									content: `- [${
										Object.customMetadata?.name ?? `<t:${new Date(Object.customMetadata?.date!).getTime() / 1000}:f>`
									}](${url}/${Object.key}) by <@${Object.customMetadata?.userId}>`,
								},
							],
						};
					}),
				},
			],
		},
	};
}
