import {
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
	APIInteractionResponseChannelMessageWithSource,
	ApplicationCommandOptionType,
	MessageFlags,
	PermissionFlagsBits,
} from 'discord-api-types/v10';
import { isGuildInteraction } from 'discord-api-types/utils';
import { APIChatInputApplicationSubcommandInteraction, APIChatInputApplicationGroupSubcommandInteraction } from './types';
import { messageResponse } from './responses';

// export function paginationButtons(
// 	pageSize: number,
// 	currentPage: number,
// 	pageCount: number
// ): APIActionRowComponent<>[] {
// 	return [
// 		{
// 			type: ComponentType.ActionRow,
// 			components: [
// 				{
// 					type: ComponentType.Button,
// 					style: ButtonStyle.Primary,
// 					label: 'Previous',
// 					custom_id: `page-previous-${pageSize}-${currentPage}-${pageCount}`,
// 					disabled: currentPage === 1,
// 				},
// 				{
// 					type: ComponentType.Button,
// 					style: ButtonStyle.Primary,
// 					label: 'Next',
// 					custom_id: `page-next-${pageSize}-${currentPage}-${pageCount}`,
// 					disabled: currentPage === pageCount,
// 				},
// 			],
// 		},
// 	];
// }

// export function listPillowsEmbed(
// 	pillows: PillowR2Objects,
// 	page: number,
// 	pageSize: number,
// 	pageCount: number,
// 	pillowCount: number
// ): APIEmbed {
// 	return {
// 		title: 'Here are the pillows',
// 		description: `Showing page ${page}/${pageCount} out of ${pillowCount} submissions`,
// 		fields: [
// 			{
// 				name: 'Name',
// 				value: pillows.objects
// 					.slice((page - 1) * pageSize, pageSize * page)
// 					.map((pillow) => `[${pillow.customMetadata?.name}](https://pillows.fry.api.lisekilis.dev/${pillow.key})`)
// 					.join('\n'),
// 				inline: true,
// 			},
// 			{
// 				name: 'Type',
// 				value: pillows.objects
// 					.slice((page - 1) * pageSize, pageSize * page)
// 					.map((pillow) => pillow.customMetadata?.type)
// 					.join('\n'),
// 				inline: true,
// 			},
// 			{
// 				name: 'Creator',
// 				value: pillows.objects
// 					.slice((page - 1) * pageSize, pageSize * page)
// 					.map((pillow) => `<@${pillow.customMetadata?.userId}>`)
// 					.join('\n'),
// 				inline: true,
// 			},
// 		],
// 		footer: {
// 			text: 'Click on the name to view the pillow',
// 		},
// 		color: 0x9469c9,
// 	};
// }

// export function listPhotosEmbed(photos: PhotoR2Objects, page: number, pageSize: number, pageCount: number, photoCount: number): APIEmbed {
// 	return {
// 		title: 'Here are the photos',
// 		description: `Showingpage ${page}/${pageCount} out of ${photoCount} group photos`,
// 		fields: [
// 			{
// 				name: 'Id',
// 				value: photos.objects
// 					.slice((page - 1) * pageSize, pageSize * page)
// 					.map((photo) => `[${photo.key}](https://photos.fry.api.lisekilis.dev/${photo.key})`)
// 					.join('\n'),
// 				inline: true,
// 			},
// 			{
// 				name: 'Date',
// 				value: photos.objects
// 					.slice((page - 1) * pageSize, pageSize * page)
// 					.map((photo) => photo.customMetadata?.date)
// 					.join('\n'),
// 				inline: true,
// 			},
// 			{
// 				name: 'Photographer',
// 				value: photos.objects
// 					.slice((page - 1) * pageSize, pageSize * page)
// 					.map((photo) => `<@${photo.customMetadata?.userId}>`)
// 					.join('\n'),
// 				inline: true,
// 			},
// 		],
// 		footer: {
// 			text: 'Click on the id to view the photo',
// 		},
// 		color: 0x9469c9,
// 	};
// }

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

export async function verifyWhitelist(interaction: APIInteraction, env: Env) {
	const ownerId = env.FRY_OWNER_ID.get();
	if (isGuildInteraction(interaction)) {
		const settings = JSON.parse((await env.FRY_SETTINGS.get(interaction.guild_id)) ?? '');
		const isOwner = interaction.member.user.id === (await ownerId);
		if (isOwner) return false; // Owner is always whitelisted
		if (!settings.name) {
			return messageResponse('This server is not whitelisted', MessageFlags.Ephemeral);
		}
		return false;
	}
	if (interaction.user?.id === (await ownerId)) return false; // Owner is always whitelisted
	return messageResponse(`Only <@${await ownerId}> can use this command`, MessageFlags.Ephemeral);
}

export async function verifyMod(interaction: APIInteraction, env: Env) {
	const whitelistCheck = await verifyWhitelist(interaction, env);
	if (whitelistCheck) return whitelistCheck;

	if (isGuildInteraction(interaction)) {
		const settings = JSON.parse((await env.FRY_SETTINGS.get(interaction.guild_id)) ?? '');
		if (!settings || !settings.mods || !settings.mods.includes(interaction.member.user.id)) {
			return messageResponse('Only Moderators are permitted to use this command', MessageFlags.Ephemeral);
		}
		return false;
	}
	return messageResponse('How did we get here? (mod check)', MessageFlags.Ephemeral);
}

export async function verifyAdmin(interaction: APIInteraction, env: Env): Promise<false | APIInteractionResponseChannelMessageWithSource> {
	const whitelistCheck = await verifyWhitelist(interaction, env);
	if (whitelistCheck) return whitelistCheck;

	if (isGuildInteraction(interaction)) {
		if ((BigInt(interaction.member.permissions) & PermissionFlagsBits.Administrator) !== PermissionFlagsBits.Administrator) {
			return messageResponse('Only Administrators are permitted to use this command', MessageFlags.Ephemeral);
		}
		return false;
	}
	return messageResponse('How did we get here? (admin check)', MessageFlags.Ephemeral);
}

export async function verifyUser(interaction: APIInteraction, id: string): Promise<false | APIInteractionResponseChannelMessageWithSource> {
	if (isGuildInteraction(interaction)) {
		if (interaction.member.user.id === id) return false; // User is always verified
		return messageResponse(`Only <@${id}> is allowed to use this command.`, MessageFlags.Ephemeral);
	}
	if (interaction.user?.id === id) {
		return false; // User is always verified
	}
	return messageResponse(`Only <@${id}> is allowed to use this command.`, MessageFlags.Ephemeral);
}
