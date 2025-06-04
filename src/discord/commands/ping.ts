import { getTimestamp } from 'discord-snowflake';
import { messageResponse } from '../responses';
import { command } from '.';
import { ApplicationCommandType } from 'discord-api-types/v10';

export default command({
	name: 'ping',
	description: 'Check the response time of the app',
	type: ApplicationCommandType.ChatInput,
	execute: async (interaction) => {
		const startTime = getTimestamp(`${BigInt(interaction.id)}`);
		const endTime = Date.now();
		const ping = endTime - startTime;

		return messageResponse(`🏓Pong!\n-# Latency: ${ping}ms`);
	},
});
