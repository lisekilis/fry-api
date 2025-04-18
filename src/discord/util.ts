import {
	APIActionRowComponent,
	APIChatInputApplicationCommandInteraction,
	APIEmbed,
	APIInteraction,
	APIMessageActionRowComponent,
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
} from 'discord-api-types/v10';
import { PhotoR2Objects, PillowR2Objects } from '../types';
import { isGuildInteraction } from 'discord-api-types/utils';
import { APIChatInputApplicationGroupSubcommandInteraction } from './commands';
import { APIChatInputApplicationSubcommandInteraction } from './commands';

export function paginationButtons(
	pageSize: number,
	currentPage: number,
	pageCount: number
): APIActionRowComponent<APIMessageActionRowComponent>[] {
	return [
		{
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.Button,
					style: ButtonStyle.Primary,
					label: 'Previous',
					custom_id: `page-previous-${pageSize}-${currentPage}-${pageCount}`,
					disabled: currentPage === 1,
				},
				{
					type: ComponentType.Button,
					style: ButtonStyle.Primary,
					label: 'Next',
					custom_id: `page-next-${pageSize}-${currentPage}-${pageCount}`,
					disabled: currentPage === pageCount,
				},
			],
		},
	];
}

export function listPillowsEmbed(
	pillows: PillowR2Objects,
	page: number,
	pageSize: number,
	pageCount: number,
	pillowCount: number
): APIEmbed {
	return {
		title: 'Here are the pillows',
		description: `Showing page ${page}/${pageCount} out of ${pillowCount} submissions`,
		fields: [
			{
				name: 'Name',
				value: pillows.objects
					.slice((page - 1) * pageSize, pageSize * page)
					.map((pillow) => `[${pillow.customMetadata?.name}](https://pillows.fry.api.lisekilis.dev/${pillow.key})`)
					.join('\n'),
				inline: true,
			},
			{
				name: 'Type',
				value: pillows.objects
					.slice((page - 1) * pageSize, pageSize * page)
					.map((pillow) => pillow.customMetadata?.type)
					.join('\n'),
				inline: true,
			},
			{
				name: 'Creator',
				value: pillows.objects
					.slice((page - 1) * pageSize, pageSize * page)
					.map((pillow) => `<@${pillow.customMetadata?.userId}>`)
					.join('\n'),
				inline: true,
			},
		],
		footer: {
			text: 'Click on the name to view the pillow',
		},
		color: 0x9469c9,
	};
}
export function listPhotosEmbed(photos: PhotoR2Objects, page: number, pageSize: number, pageCount: number, photoCount: number): APIEmbed {
	return {
		title: 'Here are the photos',
		description: `Showingpage ${page}/${pageCount} out of ${photoCount} group photos`,
		fields: [
			{
				name: 'Id',
				value: photos.objects
					.slice((page - 1) * pageSize, pageSize * page)
					.map((photo) => `[${photo.key}](https://photos.fry.api.lisekilis.dev/${photo.key})`)
					.join('\n'),
				inline: true,
			},
			{
				name: 'Date',
				value: photos.objects
					.slice((page - 1) * pageSize, pageSize * page)
					.map((photo) => photo.customMetadata?.date)
					.join('\n'),
				inline: true,
			},
			{
				name: 'Photographer',
				value: photos.objects
					.slice((page - 1) * pageSize, pageSize * page)
					.map((photo) => `<@${photo.customMetadata?.userId}>`)
					.join('\n'),
				inline: true,
			},
		],
		footer: {
			text: 'Click on the id to view the photo',
		},
		color: 0x9469c9,
	};
}
export async function verifyWhitelist(interaction: APIInteraction, env: Env): Promise<boolean> {
	if (isGuildInteraction(interaction)) {
		if (interaction.member.user.id === env.FRY_OWNER_ID) return true;
		const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
		if (!settings) return false;
		const parsedSettings = JSON.parse(settings);
		if (!parsedSettings || !parsedSettings.name) return false;
		return true;
	}
	if (interaction.user?.id === env.FRY_OWNER_ID) return true;
	return false;
}

export function isSubcommandInteraction(
	interaction: APIChatInputApplicationCommandInteraction
): interaction is APIChatInputApplicationSubcommandInteraction {
	if (!interaction.data.options || interaction.data.options[0].type !== ApplicationCommandOptionType.Subcommand) return false;
	return true;
}

export function isGroupSubcommandInteraction(
	interaction: APIChatInputApplicationCommandInteraction
): interaction is APIChatInputApplicationGroupSubcommandInteraction {
	if (
		!interaction.data.options ||
		interaction.data.options[0].type !== ApplicationCommandOptionType.SubcommandGroup ||
		!interaction.data.options[0].options ||
		interaction.data.options[0].options[0].type !== ApplicationCommandOptionType.Subcommand
	)
		return false;
	return true;
}
