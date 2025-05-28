import {
	APIInteractionResponseChannelMessageWithSource,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from 'discord-api-types/v10';
import { command, subcommand } from '.';
import { messageResponse } from '../responses';
import { PillowType } from '../../types';

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
						return messageResponse(
							`Multiple pillows found matching the criteria. Please specify an ID to delete a specific pillow.\nFound: ${pillows.objects
								.map((p) => p.key)
								.join(', ')}`,
							MessageFlags.Ephemeral
						);
					}
					id = pillows.objects[0].key;
				}
				return await confirmDelete(id, env.FRY_PILLOWS, env.PILLOW_URL);
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
					default:
						return messageResponse('How did we get here?', MessageFlags.Ephemeral);
				}
			},
		}),
	],
});

async function confirmDelete(id: string, bucket: R2Bucket, url: string): Promise<APIInteractionResponseChannelMessageWithSource> {
	const item = await bucket.head(id);
	if (!item || !item.customMetadata) return messageResponse('The item was not found or has no metadata.', MessageFlags.Ephemeral);
	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: `Are you sure you want to delete this item? This action cannot be undone.`,
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
							content: `Metadata: \n\`${JSON.stringify(item.customMetadata, null, 2)}\``,
						},
						{
							type: ComponentType.Separator,
						},
						{
							type: ComponentType.TextDisplay,
							content: `ID: \`${id}\`\nThis will delete the entry permanently.`,
						},
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									style: ButtonStyle.Danger,
									label: 'Delete',
									custom_id: `confirm-${id}`,
								},
								{
									type: ComponentType.Button,
									style: ButtonStyle.Secondary,
									label: 'Cancel',
									custom_id: 'cancel',
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

async function listItems(list: R2Objects, url: string): Promise<APIInteractionResponseChannelMessageWithSource> {
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
					components: [
						{
							type: ComponentType.TextDisplay,
							content: list.objects
								.map(
									(obj) =>
										`- [${obj.key} - ${
											obj.customMetadata?.name ?? `<t:${new Date(obj.customMetadata?.date!).getTime() / 1000}:f>`
										}](${url}/${obj.key}) by <@${obj.customMetadata?.userId}>`
								)
								.join('\\n'),
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							custom_id: 'select-item',
							options: list.objects.map((obj) => ({
								label: obj.customMetadata?.name || obj.key,
								value: obj.key,
								description: obj.customMetadata?.name ?? obj.customMetadata?.date,
								emoji: {
									name: '🗑️',
								},
							})),
						},
					],
				},
			],
		},
	};
}
