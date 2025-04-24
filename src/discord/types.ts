import {
	APIApplicationCommandBasicOption,
	APIApplicationCommandInteractionDataSubcommandGroupOption,
	APIApplicationCommandInteractionDataSubcommandOption,
	APIApplicationCommandOption,
	APIApplicationCommandSubcommandOption,
	APIChatInputApplicationCommandInteraction,
	APIChatInputApplicationCommandInteractionData,
	ApplicationCommandOptionType,
	ApplicationCommandType,
} from 'discord-api-types/v10';

export type ChatInputCommand = BasicCommand | ChatInputCommandGroup;

export type ChatInputCommandParameters = BasicCommand | Omit<ChatInputCommandGroup, 'options' | 'execute'>;

type BasicCommandData = {
	name: string;
	description: string;
};

type BasicCommand = BasicCommandData & {
	type: ApplicationCommandType.ChatInput;
	options?: APIApplicationCommandBasicOption[];
	execute: (interaction: APIChatInputApplicationCommandInteraction, env: Env, ctx: ExecutionContext) => Promise<Response>;
};

export type ChatInputCommandGroup = BasicCommandData & {
	type: ApplicationCommandType.ChatInput;
	options: APIApplicationCommandOption[];
	subcommandGroups?: SubcommandGroup[];
	subcommands?: Subcommand[];
	execute: (interaction: APIChatInputApplicationCommandInteraction, env: Env, ctx: ExecutionContext) => Promise<Response>;
};

export type SubcommandGroup = BasicCommandData & {
	type: ApplicationCommandOptionType.SubcommandGroup;
	options?: APIApplicationCommandSubcommandOption[];
	subcommands: GroupSubcommand[];
};

export type SubcommandGroupParameters = Omit<SubcommandGroup, 'options'>;

export type Subcommand = BasicCommandData & {
	type: ApplicationCommandOptionType.Subcommand;
	options?: APIApplicationCommandBasicOption[];
	execute: (interaction: APIChatInputApplicationSubcommandInteraction, env: Env, ctx: ExecutionContext) => Promise<Response>;
};

export type GroupSubcommand = BasicCommandData & {
	type: ApplicationCommandOptionType.Subcommand;
	options?: APIApplicationCommandBasicOption[];
	execute: (interaction: APIChatInputApplicationGroupSubcommandInteraction, env: Env, ctx: ExecutionContext) => Promise<Response>;
};

interface APIChatInputApplicationSubcommandInteractionData extends Omit<APIChatInputApplicationCommandInteractionData, 'options'> {
	options: [APIApplicationCommandInteractionDataSubcommandOption];
}

interface APIChatInputApplicationGroupSubcommandInteractionData extends Omit<APIChatInputApplicationCommandInteractionData, 'options'> {
	options: [APIApplicationCommandInteractionDataSubcommandGroupOption];
}

export interface APIChatInputApplicationSubcommandInteraction extends Omit<APIChatInputApplicationCommandInteraction, 'data'> {
	data: APIChatInputApplicationSubcommandInteractionData;
}

export interface APIChatInputApplicationGroupSubcommandInteraction extends Omit<APIChatInputApplicationCommandInteraction, 'data'> {
	data: APIChatInputApplicationGroupSubcommandInteractionData;
}
