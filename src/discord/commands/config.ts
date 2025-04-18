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
import { isGuildInteraction } from 'discord-api-types/utils';

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
				if (!interaction.data.options || interaction.data.options[0].type !== ApplicationCommandOptionType.Subcommand)
					return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
				if (!isGuildInteraction(interaction)) return messageResponse('This command can only be used in a server', MessageFlags.Ephemeral);
				if (interaction.member.user.id !== env.FRY_OWNER_ID && !interaction.member.permissions.includes('Administrator'))
					return messageResponse(`Only <@${env.FRY_OWNER_ID}> and Administrators can change the mod role`, MessageFlags.Ephemeral);
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
						if (!isGuildInteraction(interaction))
							return messageResponse('This command can only be used in a server', MessageFlags.Ephemeral);
						if (interaction.member.user.id !== env.FRY_OWNER_ID && !interaction.member.permissions.includes('Administrator'))
							return messageResponse(
								`Only <@${env.FRY_OWNER_ID}> and Administrators can change the pillow channel`,
								MessageFlags.Ephemeral
							);
						if (!interaction.data.options[0].options) {
							const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
							const parsedSettings = settings ? JSON.parse(settings) : {};
							if (parsedSettings.pillowChannelId) {
								return messageResponse(`Current pillow channel: <#${parsedSettings.pillowChannelId}>`, MessageFlags.Ephemeral);
							}
							return messageResponse('No pillow channel set', MessageFlags.Ephemeral);
						}
						const pillowChannelOption = interaction.data.options[0].options.find((option) => option.name === 'channel');
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
					execute: async (interaction, env) => {},
				}),
			],
		}),
	],
});

export async function handleConfigCommand(
	interaction: APIChatInputApplicationCommandGuildInteraction,
	env: Env,
	ctx: ExecutionContext
): Promise<Response> {
	// Validate the interaction has proper options structure
	if (
		!interaction.data.options?.[0] ||
		(interaction.data.options[0].type !== ApplicationCommandOptionType.Subcommand &&
			interaction.data.options[0].type !== ApplicationCommandOptionType.SubcommandGroup)
	) {
		return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);
	}

	try {
		switch (interaction.data.options[0].name) {
			case 'mod':
				if (!interaction.data.options[0].options) {
					// Show current mod role (if any)
					const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
					const parsedSettings = settings ? JSON.parse(settings) : {};
					if (parsedSettings.modRoleId) {
						return messageResponse(`Current mod role: <@&${parsedSettings.modRoleId}>`, MessageFlags.Ephemeral);
					}
					return messageResponse('No mod role set', MessageFlags.Ephemeral);
				}

				// Set new mod role
				const roleOption = interaction.data.options[0].options.find(
					(option) => option.name === 'role'
				) as APIApplicationCommandInteractionDataBasicOption;
				if (!roleOption || typeof roleOption.value !== 'string') {
					return messageResponse('Invalid role provided', MessageFlags.Ephemeral);
				}
				await patchSettings(interaction.guild_id, { modRoleId: roleOption.value }, env);
				console.log(`Setting mod role: ${roleOption.value} for guild: ${interaction.guild_id}`);
				return messageResponse('Mod role set successfully', MessageFlags.Ephemeral);

			case 'channel':
				// Validate channel subcommand exists
				if (
					!interaction.data.options[0].options?.[0] ||
					interaction.data.options[0].options[0].type !== ApplicationCommandOptionType.Subcommand
				) {
					return messageResponse('Please provide a valid channel subcommand', MessageFlags.Ephemeral);
				}

				switch (interaction.data.options[0].options[0].name) {
					case 'pillow':
						if (!interaction.data.options[0].options[0].options) {
							// Show current pillow channel (if any)
							const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
							const parsedSettings = settings ? JSON.parse(settings) : {};
							if (parsedSettings.pillowChannelId) {
								return messageResponse(`Current pillow channel: <#${parsedSettings.pillowChannelId}>`, MessageFlags.Ephemeral);
							}
							return messageResponse('No pillow channel set', MessageFlags.Ephemeral);
						}

						// Set new pillow channel
						const pillowChannelOption = interaction.data.options[0].options[0].options.find((option) => option.name === 'channel');
						if (!pillowChannelOption || typeof pillowChannelOption.value !== 'string') {
							return messageResponse('Invalid channel provided', MessageFlags.Ephemeral);
						}

						await patchSettings(interaction.guild_id, { pillowChannelId: pillowChannelOption.value }, env);
						console.log(`Setting pillow channel: ${pillowChannelOption.value} for guild: ${interaction.guild_id}`);
						return messageResponse('Pillow channel set successfully', MessageFlags.Ephemeral);

					case 'photo':
						if (!interaction.data.options[0].options[0].options) {
							// Show current photo channel (if any)
							const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
							const parsedSettings = settings ? JSON.parse(settings) : {};
							if (parsedSettings.photoChannelId) {
								return messageResponse(`Current photo channel: <#${parsedSettings.photoChannelId}>`, MessageFlags.Ephemeral);
							}
							return messageResponse('No photo channel set', MessageFlags.Ephemeral);
						}

						// Set new photo channel
						const photoChannelOption = interaction.data.options[0].options[0].options.find((option) => option.name === 'channel');
						if (!photoChannelOption || typeof photoChannelOption.value !== 'string') {
							return messageResponse('Invalid channel provided', MessageFlags.Ephemeral);
						}

						await patchSettings(interaction.guild_id, { photoChannelId: photoChannelOption.value }, env);
						console.log(`Setting photo channel: ${photoChannelOption.value} for guild: ${interaction.guild_id}`);
						return messageResponse('Photo channel set successfully', MessageFlags.Ephemeral);
				}
			case 'global':
				if (interaction.member.user.id !== env.FRY_OWNER_ID)
					return messageResponse(`Only <@${env.FRY_OWNER_ID}> can change the global settings`, MessageFlags.Ephemeral);
				if (
					!interaction.data.options[0].options?.[0] ||
					interaction.data.options[0].options[0].type !== ApplicationCommandOptionType.Subcommand
				) {
					return messageResponse('Please provide a valid channel subcommand', MessageFlags.Ephemeral);
				}
				switch (interaction.data.options[0].options[0].name) {
					case 'whitelist':
						const whitelistOptions = {
							guild: interaction.data.options[0].options[0].options?.find((option) => option.name === 'guild')?.value,
							name: interaction.data.options[0].options[0].options?.find((option) => option.name === 'name')?.value,
							toggle: interaction.data.options[0].options[0].options?.find((option) => option.name === 'toggle')?.value ?? true,
						};

						if (!whitelistOptions.guild && !whitelistOptions.name) {
							const settings = await env.FRY_SETTINGS.list();
							// Show current whitelist (if any)
							if (settings.keys.length > 0) {
								return messageResponse(`Current whitelist: \`\`\`ts\n${JSON.stringify(settings.keys)}\`\`\``, MessageFlags.Ephemeral);
							}
							return messageResponse('No whitelist set', MessageFlags.Ephemeral);
						}

						if (!whitelistOptions.guild || typeof whitelistOptions.guild !== 'string')
							return messageResponse('Invalid options provided', MessageFlags.Ephemeral);

						if (!whitelistOptions.toggle) {
							console.log(`Removing whitelist for guild: ${interaction.guild_id}`);
							await env.FRY_SETTINGS.delete(interaction.guild_id);
							return messageResponse('Whitelist removed successfully', MessageFlags.Ephemeral);
						}
						if (!whitelistOptions.name || typeof whitelistOptions.name !== 'string')
							return messageResponse('Invalid name provided', MessageFlags.Ephemeral);
						console.log(`Setting whitelist: ${whitelistOptions.guild} for guild: ${interaction.guild_id}`);
						ctx.waitUntil(patchSettings(whitelistOptions.guild, { name: whitelistOptions.name }, env));
						return messageResponse('Whitelist set successfully', MessageFlags.Ephemeral);
				}

			default:
				return messageResponse('Unknown subcommand', MessageFlags.Ephemeral);
		}
	} catch (error) {
		console.error(`Error in handleConfigCommand: ${error}`);
		return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
	}
}
