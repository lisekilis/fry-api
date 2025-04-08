import { getTimestamp } from 'discord-snowflake';
import { messageResponse } from '../responses';
import { slashCommand } from '.';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';

export default slashCommand({
	name: 'ping',
	description: 'Check the response time of the app',
	type: ApplicationCommandType.ChatInput,
	execute: async (interaction) => {
		const startTime = getTimestamp(`${BigInt(interaction.id)}`);
		const endTime = Date.now();
		const ping = endTime - startTime;

		return messageResponse(`Pong! Latency: ${ping}ms`);
	},
});
