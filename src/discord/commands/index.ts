import {
	APIApplicationCommandOption,
	APIChatInputApplicationCommandInteraction,
	ApplicationCommandType,
	APIApplicationCommandSubcommandOption,
	APIApplicationCommandBasicOption,
	APIApplicationCommandSubcommandGroupOption,
	ApplicationCommandOptionType,
	APIApplicationCommand,
} from 'discord-api-types/v10';

export function slashCommand(command: CommandParapeters): Command;
export function slashCommand(command: BasicCommandParameters): BasicCommand;
export function slashCommand(command: SubcommandGroupParameters): SubcommandGroup;
export function slashCommand(
	command: CommandParapeters | BasicCommandParameters | SubcommandGroupParameters
): Command | BasicCommand | SubcommandGroup {
	if (!('type' in command)) throw new Error('Command type is required');
	if ('execute' in command) {
		return command as BasicCommand;
	}

	const newCommand = {
		...command,
		options: `options` in command ? command.options : undefined,
	};
	return {
		...(command as Command),
	};
}

type Command =
	| BasicCommand
	| ({
			name: string;
			description: string;
			type: ApplicationCommandType.ChatInput;
			options: APIApplicationCommandOption[];
	  } & (
			| { subcommands?: BasicCommand[]; subcommandGroups: SubcommandGroup[] }
			| { subcommands: BasicCommand[]; subcommandGroups?: SubcommandGroup[] }
	  ));

type BasicCommand = APIApplicationCommandSubcommandOption & {
	execute: (interaction: APIChatInputApplicationCommandInteraction) => Promise<Response>;
};

type SubcommandGroup = APIApplicationCommandSubcommandGroupOption & {
	subcommands: BasicCommand[];
};

type CommandParapeters = {
	name: string;
	description: string;
	type: ApplicationCommandType.ChatInput;
} & (
	| {
			subcommands?: BasicCommand[];
			subcommandGroups: SubcommandGroup[];
	  }
	| {
			subcommands: BasicCommand[];
			subcommandGroups?: SubcommandGroup[];
	  }
);

type BasicCommandParameters = APIApplicationCommandSubcommandOption & {
	execute: (interaction: APIChatInputApplicationCommandInteraction) => Promise<Response>;
};

// TODO: omit options
type SubcommandGroupParameters = APIApplicationCommandSubcommandGroupOption & {
	subcommands: BasicCommand[];
};
