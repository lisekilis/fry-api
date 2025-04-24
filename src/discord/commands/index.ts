import {
	APIApplicationCommandInteraction,
	APIApplicationCommandSubcommandGroupOption,
	APIApplicationCommandSubcommandOption,
	APIChatInputApplicationCommandInteraction, // Added import
	ApplicationCommandOptionType,
	MessageFlags,
} from 'discord-api-types/v10';
import { messageResponse } from '../responses';
import { isChatInputApplicationCommandInteraction } from 'discord-api-types/utils';
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

export default async function (interaction: APIApplicationCommandInteraction, env: Env, ctx: ExecutionContext): Promise<Response> {
	try {
		const commandName = interaction.data.name;
		const modulePath = `./${commandName}.ts`; // Construct the file path dynamically
		const commandModule = (await import(modulePath)) as ChatInputCommand; // Dynamically import the module
		if (isChatInputApplicationCommandInteraction(interaction)) return await commandModule.execute(interaction, env, ctx);
	} catch (error) {
		return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
	}
	return messageResponse('Command not found', MessageFlags.Ephemeral);
}

export function command(command: ChatInputCommandParameters): ChatInputCommand {
	if ('execute' in command) return command;
	const subcommandOptions =
		(command.subcommands?.map((subcommand) => ({
			name: subcommand.name,
			description: subcommand.description,
			type: ApplicationCommandOptionType.Subcommand,
			options: subcommand.options,
		})) as APIApplicationCommandSubcommandOption[]) ?? undefined;
	const subcommandGroupOptions =
		(command.subcommandGroups?.map((subcommandGroup) => ({
			name: subcommandGroup.name,
			description: subcommandGroup.description,
			type: ApplicationCommandOptionType.SubcommandGroup,
			options: subcommandGroup.options,
		})) as APIApplicationCommandSubcommandGroupOption[]) ?? undefined;
	if (command.subcommands && command.subcommandGroups) {
		return {
			...command,
			options: [...subcommandOptions, ...subcommandGroupOptions],
			execute: (interaction: APIChatInputApplicationCommandInteraction, env: Env, ctx: ExecutionContext) => {
				if (isSubcommandInteraction(interaction) && command.subcommands) {
					if (!interaction.data.options) return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
					const subcommandInteraction = interaction as APIChatInputApplicationSubcommandInteraction;
					return findSubcommand(subcommandInteraction.data.options[0].name, command.subcommands)?.execute(subcommandInteraction, env, ctx);
				}
				if (isGroupSubcommandInteraction(interaction) && command.subcommandGroups) {
					if (!interaction.data.options || !('options' in interaction.data.options[0]) || !interaction.data.options[0].options) {
						return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
					}
					const subcommandGroupInteraction = interaction as APIChatInputApplicationGroupSubcommandInteraction;
					return findSubcommand(
						subcommandGroupInteraction.data.options[0].name,
						subcommandGroupInteraction.data.options[0].options[0].name,
						command.subcommandGroups
					)?.execute(subcommandGroupInteraction, env, ctx);
				}
				return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
			},
		} as ChatInputCommandGroup;
	}
	if (command.subcommands) {
		return {
			...command,
			options: subcommandOptions,
			execute: (interaction: APIChatInputApplicationCommandInteraction, env: Env, ctx: ExecutionContext) => {
				if (isSubcommandInteraction(interaction) && command.subcommands) {
					if (!interaction.data.options) return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
					const subcommandInteraction = interaction as APIChatInputApplicationSubcommandInteraction;
					return findSubcommand(subcommandInteraction.data.options[0].name, command.subcommands)?.execute(subcommandInteraction, env, ctx);
				}
				return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
			},
		} as ChatInputCommandGroup;
	}
	if (command.subcommandGroups) {
		return {
			...command,
			options: subcommandGroupOptions,
			execute: (interaction: APIChatInputApplicationCommandInteraction, env: Env, ctx: ExecutionContext) => {
				if (isGroupSubcommandInteraction(interaction) && command.subcommandGroups) {
					if (!interaction.data.options || !('options' in interaction.data.options[0]) || !interaction.data.options[0].options) {
						return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
					}
					const subcommandGroupInteraction = interaction as APIChatInputApplicationGroupSubcommandInteraction;
					return findSubcommand(
						subcommandGroupInteraction.data.options[0].name,
						subcommandGroupInteraction.data.options[0].options[0].name,
						command.subcommandGroups
					)?.execute(subcommandGroupInteraction, env, ctx);
				}
				return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
			},
		} as ChatInputCommandGroup;
	}
	throw new Error('Command must have either subcommand or subcommand group options');
}

export function subcommandGroup(command: SubcommandGroupParameters): SubcommandGroup {
	return {
		...command,
		options: command.subcommands.map((subcommand) => ({
			name: subcommand.name,
			description: subcommand.description,
			type: ApplicationCommandOptionType.Subcommand,
			options: subcommand.options,
		})) as APIApplicationCommandSubcommandOption[],
	};
}

export function subcommand(command: Subcommand): Subcommand {
	return command;
}
export function groupSubcommand(command: GroupSubcommand): GroupSubcommand {
	return command;
}

export function findSubcommand(name: string, subcommands: Subcommand[]): Subcommand | undefined;
export function findSubcommand(groupName: string, name: string, subcommandGroups: SubcommandGroup[]): GroupSubcommand | undefined;
export function findSubcommand(
	nameOrGroupName: string,
	nameOrSubcommands?: string | Subcommand[],
	subcommandGroups?: SubcommandGroup[]
): Subcommand | GroupSubcommand | undefined {
	if (typeof nameOrSubcommands === 'string' && Array.isArray(subcommandGroups)) {
		const group = subcommandGroups.find((subcommandGroup) => subcommandGroup.name === nameOrGroupName);
		if (group) {
			return group.subcommands.find((subcommand) => subcommand.name === nameOrSubcommands) as GroupSubcommand | undefined;
		}
	} else if (Array.isArray(nameOrSubcommands)) {
		return nameOrSubcommands.find((subcommand) => subcommand.name === nameOrGroupName) as Subcommand | undefined;
	}
	return undefined;
}
