import { getTimestamp } from 'discord-snowflake';
import { messageResponse } from '../responses';
import { slashCommand } from '.';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default slashCommand({
	name: 'ping',
	description: 'Check the response time of the app',
	options: [
		{
			name: 'ephemeral',
			description: 'Whether to send the response as ephemeral',
			type: ApplicationCommandOptionType.Boolean,
			required: true,
		},
	],

	execute: async (interaction) => {
		const startTime = getTimestamp(`${BigInt(interaction.id)}`);
		const endTime = Date.now();
		const ping = endTime - startTime;
		const ephemeral = interaction.data.options.find((option) => option.name === 'ephemeral');

		return messageResponse(`Pong! Latency: ${ping}ms`);
	},
});
