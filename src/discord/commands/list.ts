import {
	APIMessageComponentInteraction,
	APIMessageTopLevelComponent,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from 'discord-api-types/v10';
import { command, subcommand } from '.';
import { messageResponse } from '../responses';

export default command({
	name: 'list',
	description: 'list stored images',
	type: ApplicationCommandType.ChatInput,
	subcommands: [
		subcommand({
			name: 'pillows',
			description: 'list stored pillows',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'page',
					type: ApplicationCommandOptionType.Integer,
					description: 'Page number to list',
					required: false,
					min_value: 1,
				},
				{
					name: 'pageSize',
					type: ApplicationCommandOptionType.Integer,
					description: 'Number of pillows to list per page (default: 10)',
					min_value: 5,
					max_value: 50,
				},
			],
			execute: async (interaction, env) => {
				const page = Math.max(
					0,
					((interaction.data.options[0].options?.find((option) => option.name === 'page')?.value as number | undefined) ?? 0) - 1
				); // Converter to 0-based index

				const pageSize =
					(interaction.data.options[0].options?.find((option) => option.name === 'pageSize')?.value as number | undefined) ?? 10;

				try {
					const components = await listComponents(env.FRY_PILLOWS, page, pageSize, env.PILLOW_URL, 'pillows');
					return {
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: MessageFlags.IsComponentsV2,
							components,
						},
					};
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
					return messageResponse(errorMessage, MessageFlags.Ephemeral);
				}
			},
			executeComponent: async (interaction, customId, env) => {
				return await executePaginationComponent(interaction, customId, env);
			},
		}),
	],
});

const listComponents = async (
	bucket: R2Bucket,
	page: number,
	pageSize: number,
	previewUrl: string,
	name: string,
	objectCount?: number
): Promise<APIMessageTopLevelComponent[]> => {
	objectCount = objectCount ?? (await bucket.list()).objects.length;
	if (objectCount === 0) throw new Error(`No ${name} found! <a:totsLoading:895203708583944192>`);
	if (page * pageSize > objectCount) throw new Error('Page out of range');

	const pageCount = Math.ceil(objectCount / pageSize);
	const start = page * pageSize;
	const end = Math.min(start + pageSize, objectCount);

	const objects = await bucket.list({ limit: pageSize, cursor: String(start), include: ['customMetadata'] });
	const objectList = objects.objects
		.map(
			(object) =>
				`- [${object.customMetadata!.name ?? `<t:${new Date(object.customMetadata!.date).getTime() / 1000}:f>`}](${previewUrl}/${
					object.key
				}) by <@${object.customMetadata!.userId}>`
		)
		.join('\n');

	return [
		{
			type: ComponentType.TextDisplay,
			content: `Here are the ${name} I found:`,
		},
		{
			type: ComponentType.Container,
			accent_color: 0x9469c9,
			id: 69,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: `${name} (${start + 1} - ${end} | ${objectCount})`,
				},
				{
					type: ComponentType.TextDisplay,
					content: objectList,
				},
				{
					type: ComponentType.Separator,
				},
				{
					type: ComponentType.TextDisplay,
					content: `Page ${page + 1} of ${pageCount}`,
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							disabled: page === 0,
							label: 'Previous',
							custom_id: `list.${name}-${page - 1}-${pageSize}-${objectCount}`,
						},
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							disabled: page * pageSize + pageSize >= objectCount,
							label: 'Next',
							custom_id: `list.${name}-${page + 1}-${pageSize}-${objectCount}`,
						},
					],
				},
			],
		},
	];
};

const executePaginationComponent = async (interaction: APIMessageComponentInteraction, customId: string, env: Env) => {
	const [name, page, pageSize, objectCount] = customId.split('-');
	const pageNum = parseInt(page, 10);
	const pageSizeNum = parseInt(pageSize, 10);
	const objectCountNum = parseInt(objectCount, 10);
	const components = await listComponents(env.FRY_PILLOWS, pageNum, pageSizeNum, env.PILLOW_URL, name, objectCountNum);
	return new Response(
		JSON.stringify({
			type: InteractionResponseType.UpdateMessage,
			data: {
				flags: MessageFlags.IsComponentsV2,
				components,
			},
		})
	);
};
