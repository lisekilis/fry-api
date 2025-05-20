import {
	APIApplicationCommandInteraction,
	APIApplicationCommandSubcommandGroupOption,
	APIApplicationCommandSubcommandOption,
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
	ApplicationCommandOptionType,
	InteractionType,
	MessageFlags,
	APIMessageComponentInteraction, // Changed from APIMessageComponentButtonInteraction
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
	GroupSubcommand,
	BasicCommand, // Added for type casting
} from '../types';

export default async function (interaction: APIInteraction, env: Env, ctx: ExecutionContext): Promise<Response> {
	switch (interaction.type) {
		case InteractionType.ApplicationCommand:
			try {
				const commandName = interaction.data.name;
				const modulePath = `./${commandName}.ts`; // Construct the file path dynamically
				const commandModule = (await import(modulePath)) as ChatInputCommand; // Dynamically import the module
				if (isChatInputApplicationCommandInteraction(interaction)) return await commandModule.execute(interaction, env, ctx);
			} catch (error) {
				return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
			}
			break;
		case InteractionType.MessageComponent:
			if (!isMessageComponentButtonInteraction(interaction)) return messageResponse('Invalid interaction type', MessageFlags.Ephemeral);
			try {
				const match = /^(?<command>\w+)((\.(?<subcommandGroup>\w+))?(\.(?<subcommand>\w+)))?(-(?<customId>.*))/.exec(
					interaction.data.custom_id
				);
				if (!match || !match.groups || !match.groups.command || !match.groups.customId)
					return messageResponse('Invalid custom ID', MessageFlags.Ephemeral);
				const command = match.groups.command;
				const modulePath = `./${command}.ts`; // Construct the file path dynamically
				const commandModule = (await import(modulePath)) as ChatInputCommand; // Dynamically import the module
				if (commandModule.executeComponent) return await commandModule.executeComponent(interaction, match.groups.customId, env, ctx);
				return messageResponse('Component not found', MessageFlags.Ephemeral);
			} catch (error) {
				return messageResponse('An error occurred while processing the component', MessageFlags.Ephemeral);
			}
			break;
	}
	return messageResponse('Command not found', MessageFlags.Ephemeral);
}

export function command(commandParams: ChatInputCommandParameters): ChatInputCommand {
	// Case 1: It's a BasicCommand with its own execute function.
	if ('execute' in commandParams && typeof commandParams.execute === 'function') {
		// If 'execute' is present, it must be BasicCommand as per ChatInputCommandParameters definition.
		return commandParams as BasicCommand;
	}

	// Case 2: It's for defining a command with subcommands/groups.
	// Cast to the part of the union type that has subcommands/subcommandGroups.
	const groupCommandParams = commandParams as Omit<ChatInputCommandGroup, 'options' | 'execute' | 'executeComponent'>;
	const { subcommands, subcommandGroups, ...baseCommandConfig } = groupCommandParams;

	// If no direct execute (checked above) and no subcommands/groups, it's an invalid configuration.
	if (!subcommands && !subcommandGroups) {
		throw new Error('Command parameters must define an execute function, or subcommands, or subcommand groups.');
	}

	const subcommandApiOptions =
		subcommands?.map(
			(sub: Subcommand) =>
				({
					name: sub.name,
					description: sub.description,
					type: ApplicationCommandOptionType.Subcommand,
					options: sub.options,
				} as APIApplicationCommandSubcommandOption)
		) ?? []; // Default to empty array if undefined

	const subcommandGroupApiOptions =
		subcommandGroups?.map(
			(group: SubcommandGroup) =>
				({
					name: group.name,
					description: group.description,
					type: ApplicationCommandOptionType.SubcommandGroup,
					// group.options are already formatted APIApplicationCommandSubcommandOption[] by subcommandGroup helper
					options: group.options as APIApplicationCommandSubcommandOption[],
				} as APIApplicationCommandSubcommandGroupOption)
		) ?? []; // Default to empty array if undefined

	const combinedApiOptions: (APIApplicationCommandSubcommandOption | APIApplicationCommandSubcommandGroupOption)[] = [
		...subcommandApiOptions,
		...subcommandGroupApiOptions,
	];

	const executeHandler = async (
		interaction: APIChatInputApplicationCommandInteraction,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> => {
		if (isSubcommandInteraction(interaction)) {
			if (!subcommands) return messageResponse('Subcommands are not configured for this command.', MessageFlags.Ephemeral);
			if (!interaction.data.options || interaction.data.options[0]?.type !== ApplicationCommandOptionType.Subcommand) {
				return messageResponse('Invalid subcommand interaction data.', MessageFlags.Ephemeral);
			}
			const subInteraction = interaction as APIChatInputApplicationSubcommandInteraction;
			const subcommandName = subInteraction.data.options[0].name;
			const foundSubcommand = findSubcommand(subcommandName, subcommands);
			return foundSubcommand?.execute
				? foundSubcommand.execute(subInteraction, env, ctx)
				: messageResponse(`Subcommand "${subcommandName}" not found or has no executor.`, MessageFlags.Ephemeral);
		}

		if (isGroupSubcommandInteraction(interaction)) {
			if (!subcommandGroups) return messageResponse('Subcommand groups are not configured for this command.', MessageFlags.Ephemeral);
			if (
				!interaction.data.options ||
				interaction.data.options[0]?.type !== ApplicationCommandOptionType.SubcommandGroup ||
				!interaction.data.options[0].options ||
				interaction.data.options[0].options[0]?.type !== ApplicationCommandOptionType.Subcommand
			) {
				return messageResponse('Invalid subcommand group interaction data.', MessageFlags.Ephemeral);
			}
			const groupInteraction = interaction as APIChatInputApplicationGroupSubcommandInteraction;
			const groupName = groupInteraction.data.options[0].name;
			const subcommandName = groupInteraction.data.options[0].options[0].name;
			const foundGroupSubcommand = findSubcommand(groupName, subcommandName, subcommandGroups);
			return foundGroupSubcommand?.execute
				? foundGroupSubcommand.execute(groupInteraction, env, ctx)
				: messageResponse(`Subcommand "${subcommandName}" in group "${groupName}" not found or has no executor.`, MessageFlags.Ephemeral);
		}
		return messageResponse('Unsupported command interaction type for execute handler.', MessageFlags.Ephemeral);
	};

	const executeComponentHandler = async (
		interaction: APIMessageComponentInteraction, // Changed to APIMessageComponentInteraction
		forwardedCustomId: string, // This is the custom ID part for the component's logic
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> => {
		// Regex to parse out command, subcommand group (optional), and subcommand from the component's full custom_id
		// The forwardedCustomId is the part after the hyphen, which this regex also captures as 'actualIdPart'
		// but we use forwardedCustomId for clarity when calling the target handler.
		const componentRoutingRegex = /^(?<cmdName>\\w+)(?:\\.(?<subcommandGroup>\\w+))?(?:\\.(?<subcommand>\\w+))?-(?<actualIdPart>.*)/;
		const match = componentRoutingRegex.exec(interaction.data.custom_id);

		if (!match?.groups?.subcommand) {
			// This implies the custom_id format doesn't match the expected pattern for routing to a subcommand component.
			// This could happen if a top-level command (not a group/subcommand) has a component,
			// but this executeComponentHandler is for commands *defined* with subcommands/groups.
			return messageResponse('Component custom ID does not specify a subcommand for routing.', MessageFlags.Ephemeral);
		}

		const { subcommandGroup: groupName, subcommand: subcommandName } = match.groups;

		let targetHandler: Subcommand | GroupSubcommand | undefined;

		if (groupName && subcommandGroups) {
			targetHandler = findSubcommand(groupName, subcommandName, subcommandGroups);
		} else if (subcommandName && subcommands) {
			// Ensure subcommandName is truthy
			targetHandler = findSubcommand(subcommandName, subcommands);
		}

		if (targetHandler?.executeComponent) {
			return targetHandler.executeComponent(interaction, forwardedCustomId, env, ctx);
		}

		const targetPath = groupName ? `${groupName}.${subcommandName}` : subcommandName;
		if (!targetHandler) return messageResponse(`Component target handler for "${targetPath}" not found.`, MessageFlags.Ephemeral);
		return messageResponse(`Component handler (executeComponent) not implemented for "${targetPath}".`, MessageFlags.Ephemeral);
	};

	const commandDefinition: ChatInputCommandGroup = {
		...baseCommandConfig, // name, description, type (ApplicationCommandType.ChatInput)
		options: combinedApiOptions, // APIApplicationCommandOption[] (can be empty [])
		subcommands: subcommands, // Pass along the original subcommand definitions
		subcommandGroups: subcommandGroups, // Pass along the original group definitions
		execute: executeHandler,
		// Add executeComponent only if there's a possibility of it being handled by sub-components
		executeComponent: subcommands || subcommandGroups ? executeComponentHandler : undefined,
	};

	return commandDefinition;
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
