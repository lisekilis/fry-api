import {
	APIApplicationCommandBasicOption,
	APIApplicationCommandInteraction,
	APIApplicationCommandOption,
	APIApplicationCommandSubcommandGroupOption,
	APIApplicationCommandSubcommandOption,
	APIChatInputApplicationCommandGuildInteraction,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	MessageFlags,
} from 'discord-api-types/v10';
import { messageResponse } from '../responses';

export default async function (interaction: APIApplicationCommandInteraction): Promise<Response> {
	try {
		const commandName = interaction.data.name;
		const modulePath = `./${commandName}.ts`; // Construct the file path dynamically
		const commandModule = await import(modulePath); // Dynamically import the module
		if (commandModule.default) {
			return await commandModule.default(interaction); // Call the default export
		} else {
			return messageResponse('Command module not found', MessageFlags.Ephemeral);
		}
	} catch (error) {
		return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
	}
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
			execute: (interaction: APIChatInputApplicationCommandGuildInteraction) => {
				if (!interaction.data.options) return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
				if (interaction.data.options[0].type === ApplicationCommandOptionType.Subcommand && command.subcommands) {
					return findSubcommand(interaction.data.options[0].name, command.subcommands)?.execute(interaction);
				}
				if (interaction.data.options[0].type === ApplicationCommandOptionType.SubcommandGroup && command.subcommandGroups) {
					return findSubcommand(
						interaction.data.options[0].name,
						interaction.data.options[0].options[0].name,
						command.subcommandGroups
					)?.execute(interaction);
				}
				return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
			},
		} as ChatInputCommandGroup;
	}
	if (command.subcommands) {
		return {
			...command,
			options: subcommandOptions,
			execute: (interaction: APIChatInputApplicationCommandGuildInteraction) => {
				if (!interaction.data.options) return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
				if (interaction.data.options[0].type === ApplicationCommandOptionType.Subcommand && command.subcommands) {
					return findSubcommand(interaction.data.options[0].name, command.subcommands)?.execute(interaction);
				}
				return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
			},
		} as ChatInputCommandGroup;
	}
	if (command.subcommandGroups) {
		return {
			...command,
			options: subcommandGroupOptions,
			execute: (interaction: APIChatInputApplicationCommandGuildInteraction) => {
				if (!interaction.data.options) return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
				if (interaction.data.options[0].type === ApplicationCommandOptionType.SubcommandGroup && command.subcommandGroups) {
					return findSubcommand(
						interaction.data.options[0].name,
						interaction.data.options[0].options[0].name,
						command.subcommandGroups
					)?.execute(interaction);
				}
				return messageResponse('Subcommand not found', MessageFlags.Ephemeral);
			},
		} as ChatInputCommandGroup;
	}
	throw new Error('Command must have either subcommand or subcommand group options');
}

export function subcommandGroup(command: SubCommandGroupParameters): SubCommandGroup {
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

export function subcommand(command: SubCommand): SubCommand {
	return command;
}

export function findSubcommand(name: string, subcommands: SubCommand[]): SubCommand | undefined;
export function findSubcommand(groupName: string, name: string, subcommandGroups: SubCommandGroup[]): SubCommand | undefined;
export function findSubcommand(
	nameOrGroupName: string,
	nameOrSubcommands?: string | SubCommand[],
	subcommandGroups?: SubCommandGroup[]
): SubCommand | undefined {
	if (typeof nameOrSubcommands === 'string' && Array.isArray(subcommandGroups)) {
		// Handle the case with groupName, name, and subcommandGroups
		const group = subcommandGroups.find((subcommandGroup) => subcommandGroup.name === nameOrGroupName);
		if (group) {
			return group.subcommands.find((subcommand) => subcommand.name === nameOrSubcommands);
		}
	} else if (Array.isArray(nameOrSubcommands)) {
		// Handle the case with name and subcommands
		return nameOrSubcommands.find((subcommand) => subcommand.name === nameOrGroupName);
	}
	return undefined;
}

type ChatInputCommand = BasicCommand | ChatInputCommandGroup;

type ChatInputCommandParameters = BasicCommand | Omit<ChatInputCommandGroup, 'options' | 'execute'>;

type BasicCommandData = {
	name: string;
	description: string;
};

type BasicCommand = BasicCommandData & {
	type: ApplicationCommandType.ChatInput;
	options?: APIApplicationCommandBasicOption[];
	execute: (interaction: APIChatInputApplicationCommandGuildInteraction) => Promise<Response>;
};

type ChatInputCommandGroup = BasicCommandData & {
	type: ApplicationCommandType.ChatInput;
	options: APIApplicationCommandOption[];
	subcommandGroups?: SubCommandGroup[];
	subcommands?: SubCommand[];
	execute: (interaction: APIChatInputApplicationCommandGuildInteraction) => Promise<Response>;
};

type SubCommandGroup = BasicCommandData & {
	type: ApplicationCommandOptionType.SubcommandGroup;
	options?: APIApplicationCommandSubcommandOption[];
	subcommands: SubCommand[];
};

type SubCommandGroupParameters = Omit<SubCommandGroup, 'options'>;

type SubCommand = BasicCommandData & {
	type: ApplicationCommandOptionType.Subcommand;
	options?: APIApplicationCommandBasicOption[];
	execute: (interaction: APIChatInputApplicationCommandGuildInteraction) => Promise<Response>;
};
