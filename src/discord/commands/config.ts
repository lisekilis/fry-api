import {
	APIChatInputApplicationCommandGuildInteraction,
	ApplicationCommandOptionType,
	MessageFlags,
	APIApplicationCommandInteractionDataBasicOption,
	ApplicationCommandType,
} from 'discord-api-types/v10';
import { patchSettings } from '../../handlers';
import { messageResponse } from '../responses';
import { command, groupSubcommand, subcommand, subcommandGroup } from '.';
import { isDMInteraction, isGuildInteraction } from 'discord-api-types/utils';
import { Settings } from '../../types';
import { verifyAdmin, verifyUser, verifyWhitelist } from '../util';

export default command({
	name: 'config',
	description: 'Configure the app settings',
	type: ApplicationCommandType.ChatInput,
	subcommands: [
		subcommand({
			name: 'mod',
			description: 'Set the image moderator role',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'role',
					type: ApplicationCommandOptionType.Role,
					description: 'Role to be set as image moderator',
				},
			],
			execute: async (interaction, env) => {
				const adminCheck = await verifyAdmin(interaction, env);
				if (adminCheck) return adminCheck;

				if (!isGuildInteraction(interaction)) return messageResponse('This command can only be used in a server', MessageFlags.Ephemeral);
				if (!interaction.data.options[0].options) {
					const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
					const parsedSettings = settings ? JSON.parse(settings) : {};
					if (parsedSettings.modRoleId) {
						return messageResponse(`Current mod role: <@&${parsedSettings.modRoleId}>`, MessageFlags.Ephemeral);
					}
					return messageResponse('No mod role set', MessageFlags.Ephemeral);
				}
				const roleOption = interaction.data.options[0].options.find(
					(option) => option.name === 'role'
				) as APIApplicationCommandInteractionDataBasicOption;
				if (!roleOption || typeof roleOption.value !== 'string') {
					return messageResponse('Invalid role provided', MessageFlags.Ephemeral);
				}
				await patchSettings(interaction.guild_id, { modRoleId: roleOption.value }, env);
				console.log(`Setting mod role: ${roleOption.value} for guild: ${interaction.guild_id}`);

				return messageResponse('Mod role set successfully', MessageFlags.Ephemeral);
			},
		}),
	],
	subcommandGroups: [
		subcommandGroup({
			name: 'channel',
			description: 'Configure the app channels',
			type: ApplicationCommandOptionType.SubcommandGroup,
			subcommands: [
				groupSubcommand({
					name: 'pillow',
					description: 'Set the pillow channel',
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: 'channel',
							type: ApplicationCommandOptionType.Channel,
							description: 'Channel to be set as pillow channel',
						},
					],
					execute: async (interaction, env) => {
						const adminCheck = await verifyAdmin(interaction, env);
						if (adminCheck) return adminCheck;

						if (!isGuildInteraction(interaction))
							return messageResponse('This command can only be used in a server', MessageFlags.Ephemeral);
						if (!interaction.data.options[0].options[0].options) {
							const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
							const parsedSettings = settings ? (JSON.parse(settings) as Settings) : {};
							if (parsedSettings.pillowChannelId) {
								return messageResponse(`Current pillow channel: <#${parsedSettings.pillowChannelId}>`, MessageFlags.Ephemeral);
							}
							return messageResponse('No pillow channel set', MessageFlags.Ephemeral);
						}
						const pillowChannelOption = interaction.data.options[0].options[0].options!.find((option) => option.name === 'channel');
						if (!pillowChannelOption || typeof pillowChannelOption.value !== 'string') {
							return messageResponse('Invalid channel provided', MessageFlags.Ephemeral);
						}
						await patchSettings(interaction.guild_id, { pillowChannelId: pillowChannelOption.value }, env);
						console.log(`Setting pillow channel: ${pillowChannelOption.value} for guild: ${interaction.guild_id}`);
						return messageResponse('Pillow channel set successfully', MessageFlags.Ephemeral);
					},
				}),
				groupSubcommand({
					name: 'photo',
					description: 'Set the photo channel',
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: 'channel',
							type: ApplicationCommandOptionType.Channel,
							description: 'Channel to be set as photo channel',
						},
					],
					execute: async (interaction, env) => {
						const adminCheck = await verifyAdmin(interaction, env);
						if (adminCheck) return adminCheck;

						if (!isGuildInteraction(interaction))
							return messageResponse('This command can only be used in a server', MessageFlags.Ephemeral);

						if (!interaction.data.options[0].options[0].options) {
							const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
							const parsedSettings = settings ? (JSON.parse(settings) as Settings) : {};
							if (parsedSettings.photoChannelId) {
								return messageResponse(`Current photo channel: <#${parsedSettings.photoChannelId}>`, MessageFlags.Ephemeral);
							}
							return messageResponse('No photo channel set', MessageFlags.Ephemeral);
						}
						const photoChannelOption = interaction.data.options[0].options[0].options!.find((option) => option.name === 'channel');
						if (!photoChannelOption || typeof photoChannelOption.value !== 'string') {
							return messageResponse('Invalid channel provided', MessageFlags.Ephemeral);
						}
						await patchSettings(interaction.guild_id, { photoChannelId: photoChannelOption.value }, env);
						console.log(`Setting photo channel: ${photoChannelOption.value} for guild: ${interaction.guild_id}`);
						return messageResponse('Photo channel set successfully', MessageFlags.Ephemeral);
					},
				}),
			],
		}),
		subcommandGroup({
			name: 'global',
			description: 'Configure the global settings',
			type: ApplicationCommandOptionType.SubcommandGroup,
			subcommands: [
				groupSubcommand({
					name: 'whitelist',
					description: 'Set the global whitelist',
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: 'guild',
							type: ApplicationCommandOptionType.String,
							description: 'Guild ID to be whitelisted',
							required: true,
						},
						{
							name: 'name',
							type: ApplicationCommandOptionType.String,
							description: 'Name of the guild to be whitelisted',
						},
						{
							name: 'toggle',
							type: ApplicationCommandOptionType.Boolean,
							description: 'Toggle the whitelist',
						},
					],
					execute: async (interaction, env, ctx) => {
						const ownerCheck = await verifyUser(interaction, await env.FRY_OWNER_ID.get());
						if (ownerCheck) return ownerCheck;

						if (!interaction.data.options[0].options[0].options) {
							const settings = await env.FRY_SETTINGS.list();
							if (settings.keys.length > 0) {
								return messageResponse(`Current whitelist: \`\`\`ts\n${JSON.stringify(settings.keys)}\`\`\``, MessageFlags.Ephemeral);
							}
							return messageResponse('No whitelist set', MessageFlags.Ephemeral);
						}
						const guildOption = interaction.data.options[0].options[0].options!.find((option) => option.name === 'guild');
						const nameOption = interaction.data.options[0].options[0].options!.find((option) => option.name === 'name');
						const toggleOption = interaction.data.options[0].options[0].options!.find((option) => option.name === 'toggle');
						if (!guildOption || typeof guildOption.value !== 'string')
							return messageResponse('Invalid options provided', MessageFlags.Ephemeral);
						if (!toggleOption?.value) {
							console.log(`Removing whitelist for guild: ${guildOption.value}`);
							await env.FRY_SETTINGS.delete(guildOption.value);
							return messageResponse('Whitelist removed successfully', MessageFlags.Ephemeral);
						}
						if (!nameOption || typeof nameOption.value !== 'string')
							return messageResponse('Invalid name provided', MessageFlags.Ephemeral);
						console.log(`Setting whitelist: ${toggleOption.value} for guild: ${guildOption.value}`);
						ctx.waitUntil(patchSettings(guildOption.value, { name: nameOption.value }, env));
						return messageResponse('Whitelist set successfully', MessageFlags.Ephemeral);
					},
				}),
			],
		}),
	],
});
