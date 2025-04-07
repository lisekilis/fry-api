// After the exported functions in handlers/discord/commands.ts, add:

import { APIChatInputApplicationCommandGuildInteraction, MessageFlags } from 'discord-api-types/v10';
import {
	handlePingCommand,
	handleConfigCommand,
	handleSubmitCommand,
	handleUploadCommand,
	handleListCommand,
	handleDeleteCommand,
	handleViewCommand,
} from './commands';
import { messageResponse } from './responses';

export async function handleApplicationCommand(
	interaction: APIChatInputApplicationCommandGuildInteraction,
	env: Env,
	ctx: ExecutionContext
): Promise<Response> {
	try {
		console.log(`Processing command: ${interaction.data.name}`);

		switch (interaction.data.name) {
			case 'ping':
				return handlePingCommand(interaction);

			case 'config':
				return await handleConfigCommand(interaction, env, ctx);

			case 'submit':
				return await handleSubmitCommand(interaction, env);

			case 'upload':
				return await handleUploadCommand(interaction, env);

			case 'list':
				return await handleListCommand(interaction, env);

			case 'delete':
				return await handleDeleteCommand(interaction, env);

			case 'view':
				return await handleViewCommand(interaction, env);

			default:
				console.log(`Unknown command: ${interaction.data.name}`);
				return messageResponse(`Command '${interaction.data.name}' not implemented yet.`, MessageFlags.Ephemeral);
		}
	} catch (error) {
		console.error(`Error in handleApplicationCommand: ${error}`);
		return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
	}
}
