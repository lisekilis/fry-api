import { APIApplicationCommandOption, APIChatInputApplicationCommandInteraction, ApplicationCommandType } from 'discord-api-types/v10';

/**
 * Creates a Discord slash command with registration capability
 * @param command - Command configuration object
 * @param command.name - The name of the slash command
 * @param command.description - Description of what the command does
 * @param command.options - Optional array of command parameters/options
 * @param command.execute - Function that handles the command execution
 * @returns The command object enhanced with a register method
 */
export function slashCommand(command: {
	name: string;
	description: string;
	options?: APIApplicationCommandOption[];
	execute: (interaction: APIChatInputApplicationCommandInteraction) => Promise<Response>;
}) {
	return {
		...command,
		register: async (url: string | URL, token: string) => {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Bot ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: command.name,
					type: ApplicationCommandType.ChatInput,
					description: command.description,
					options: command.options,
				}),
			});
			if (response.status !== 200 && response.status !== 201) {
				throw new Error(`Failed to register command: ${command.name}, Status: ${response.status}, response: ${await response.text()}`);
			}
			console.log(`Registered command: ${command.name}`);
		},
	};
}
