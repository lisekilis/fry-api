// Discord command handler and utilities
import {
	APIApplicationCommandInteraction,
	APIApplicationCommandSubcommandGroupOption,
	APIApplicationCommandSubcommandOption,
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
	APIMessageComponentInteraction,
	ApplicationCommandOptionType,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
} from 'discord-api-types/v10';
import { messageResponse } from '../responses';
import { isChatInputApplicationCommandInteraction, isMessageComponentButtonInteraction } from 'discord-api-types/utils';
import { isGroupSubcommandInteraction, isSubcommandInteraction } from '../util';
import {
	ChatInputCommand,
	ChatInputCommandParameters,
	APIChatInputApplicationSubcommandInteraction,
	APIChatInputApplicationGroupSubcommandInteraction,
	SubcommandGroup,
	Subcommand,
	SubcommandGroupParameters,
	ChatInputCommandGroup,
	GroupSubcommand,
} from '../types';

/**
 * Main Discord command dispatcher.
 */
export default async function (interaction: APIInteraction, env: Env, ctx: ExecutionContext): Promise<Response> {
	try {
		let commandName: string, modulePath: string, commandModule;
		switch (interaction.type) {
			case InteractionType.Ping:
				return new Response(
					JSON.stringify({
						type: InteractionResponseType.Pong,
					}),
					{ headers: { 'Content-Type': 'application/json' } }
				);
			case InteractionType.ApplicationCommand:
				commandName = interaction.data.name;
				modulePath = `./${commandName}.ts`;
				commandModule = await import(modulePath);
				if (!commandModule.execute) throw new Error('Command not found');
				return await executeCommandModule(commandModule as ChatInputCommand, interaction, env, ctx);

			case InteractionType.MessageComponent:
				const match = /^(?<command>\w+)((\.(?<subcommandGroup>\w+))?(\.(?<subcommand>\w+)))?(-(?<customId>.*))/.exec(
					interaction.data.custom_id
				);
				if (!match?.groups?.command || !match.groups.customId) throw new Error('Invalid custom ID');
				commandName = match.groups.command;
				modulePath = `./${command}.ts`;
				commandModule = await import(modulePath);
				if (commandModule.executeComponent) throw new Error('Component not found');
				return await executeComponentModule(commandModule as ChatInputCommand, interaction, match.groups.customId, env, ctx);
			default:
				throw new Error('Invalid interaction type');
		}
	} catch (error) {
		console.error('Error in command dispatcher:', error);
		return new Response(JSON.stringify(messageResponse(String(error), MessageFlags.Ephemeral)), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	// switch (interaction.type) {
	// 	case InteractionType.ApplicationCommand:
	// 		try {
	// 			const commandName = interaction.data.name;
	// 			const modulePath = `./${commandName}.ts`;
	// 			const commandModule = (await import(modulePath)) as ChatInputCommand;
	// 			if (isChatInputApplicationCommandInteraction(interaction)) {
	// 				return await commandModule.execute(interaction, env, ctx);
	// 			}
	// 		} catch {
	// 			return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
	// 		}
	// 		break;
	// 	case InteractionType.MessageComponent:
	// 		if (!isMessageComponentButtonInteraction(interaction)) {
	// 			return messageResponse('Invalid interaction type', MessageFlags.Ephemeral);
	// 		}
	// 		try {
	// 			const match = /^(?<command>\w+)((\.(?<subcommandGroup>\w+))?(\.(?<subcommand>\w+)))?(-(?<customId>.*))/.exec(
	// 				interaction.data.custom_id
	// 			);
	// 			if (!match?.groups?.command || !match.groups.customId) {
	// 				return messageResponse('Invalid custom ID', MessageFlags.Ephemeral);
	// 			}
	// 			const command = match.groups.command;
	// 			const modulePath = `./${command}.ts`;
	// 			const commandModule = (await import(modulePath)) as ChatInputCommand;
	// 			if (commandModule.executeComponent) {
	// 				return await commandModule.executeComponent(interaction, match.groups.customId, env, ctx);
	// 			}
	// 			return messageResponse('Component not found', MessageFlags.Ephemeral);
	// 		} catch {
	// 			return messageResponse('An error occurred while processing the component', MessageFlags.Ephemeral);
	// 		}
	// }
	// return messageResponse('Command not found', MessageFlags.Ephemeral);
}

/**
 * Factory for building a ChatInputCommand or ChatInputCommandGroup.
 */
export function command(command: ChatInputCommandParameters): ChatInputCommand {
	if ('execute' in command) return command;

	const subcommandOptions: APIApplicationCommandSubcommandOption[] | undefined = command.subcommands?.map((subcommand) => ({
		name: subcommand.name,
		description: subcommand.description,
		type: ApplicationCommandOptionType.Subcommand,
		options: subcommand.options,
	}));

	const subcommandGroupOptions: APIApplicationCommandSubcommandGroupOption[] | undefined = command.subcommandGroups?.map(
		(subcommandGroup) => ({
			name: subcommandGroup.name,
			description: subcommandGroup.description,
			type: ApplicationCommandOptionType.SubcommandGroup,
			options: subcommandGroup.subcommands.map((subcommand) => ({
				name: subcommand.name,
				description: subcommand.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: subcommand.options,
			})),
		})
	);

	return {
		...command,
		options: [...(subcommandOptions ?? []), ...(subcommandGroupOptions ?? [])],
		execute: async (interaction, env, ctx) => {
			if (!interaction.data.options || !interaction.data.options[0]) return messageResponse('No options provided', MessageFlags.Ephemeral);
			if (interaction.data.options[0].type === ApplicationCommandOptionType.Subcommand) {
				const typedInteraction = interaction as APIChatInputApplicationSubcommandInteraction;
				const subcommand = command.subcommands?.find((sub) => sub.name === typedInteraction.data.options[0].name);
				if (subcommand) {
					return await subcommand.execute(typedInteraction, env, ctx);
				} else {
					return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
				}
			}
			const subcommandGroup = command.subcommandGroups?.find((group) => group.name === interaction.data.options![0].name);
			if (
				subcommandGroup &&
				interaction.data.options[0].type === ApplicationCommandOptionType.SubcommandGroup &&
				interaction.data.options[0].options
			) {
				const typedInteraction = interaction as APIChatInputApplicationGroupSubcommandInteraction;
				const subcommand = subcommandGroup.subcommands.find((sub) => sub.name === typedInteraction.data.options[0].options[0].name);
				if (subcommand) {
					return await subcommand.execute(typedInteraction, env, ctx);
				} else {
					return messageResponse('Subcommand not found in group', MessageFlags.Ephemeral);
				}
			}
			return messageResponse('Invalid command options', MessageFlags.Ephemeral);
		},
		executeComponent: async (interaction, customId, env, ctx) => {
			const match = /^(?<command>\w+)((\.(?<subcommandGroup>\w+))?(\.(?<subcommand>\w+)))?(-(?<customId>.*))/.exec(
				interaction.data.custom_id
			);
			if (!match?.groups?.command || !match.groups.customId) return messageResponse('Invalid custom ID', MessageFlags.Ephemeral);
			if (match.groups.subcommand) {
				if (match.groups.subcommandGroup) {
					const subcommandGroup = command.subcommandGroups?.find((group) => group.name === match.groups!.subcommandGroup);
					if (subcommandGroup) {
						const subcommand = subcommandGroup.subcommands.find((sub) => sub.name === match.groups!.subcommand);
						if (subcommand && subcommand.executeComponent) {
							return await subcommand.executeComponent(interaction, match.groups.customId, env, ctx);
						}
					}
				}
				const subcommand = command.subcommands?.find((sub) => sub.name === match.groups!.subcommand);
				if (subcommand && subcommand.executeComponent) {
					return await subcommand.executeComponent(interaction, match.groups.customId, env, ctx);
				}
			}
			return messageResponse('Invalid command options', MessageFlags.Ephemeral);
		},
	};
}

export function subcommandGroup(command: SubcommandGroupParameters): SubcommandGroup {
	return {
		...command,
		options: command.subcommands.map((subcommand) => ({
			name: subcommand.name,
			description: subcommand.description,
			type: ApplicationCommandOptionType.Subcommand,
			options: subcommand.options,
		})),
	};
}

export function subcommand(command: Subcommand): Subcommand {
	return command;
}

export function groupSubcommand(command: GroupSubcommand): GroupSubcommand {
	return command;
}

async function executeCommandModule(
	command: ChatInputCommand,
	interaction: APIApplicationCommandInteraction,
	env: Env,
	ctx: ExecutionContext
): Promise<Response> {
	if (isChatInputApplicationCommandInteraction(interaction)) {
		const res = await command.execute(interaction, env, ctx);
		if (res instanceof Response) {
			return res;
		}
		return new Response(JSON.stringify(res), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	throw new Error('Invalid interaction type');
}
async function executeComponentModule(
	command: ChatInputCommand,
	interaction: APIMessageComponentInteraction,
	customId: string,
	env: Env,
	ctx: ExecutionContext
): Promise<Response> {
	if (!command.executeComponent) throw new Error('Component not found');
	const res = await command.executeComponent(interaction, customId, env, ctx);
	if (res instanceof Response) {
		return res;
	}
	return new Response(JSON.stringify(res), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}
