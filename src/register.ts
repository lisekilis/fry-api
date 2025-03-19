import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';
import { env } from 'process';
import { Command, PillowType } from './types';

const APPLICATION_ID = env.DISCORD_APP_ID;
const BOT_TOKEN = env.DISCORD_API_TOKEN;

const commands: Command[] = [
	{
		name: 'ping',
		type: ApplicationCommandType.ChatInput,
		description: 'Check the response time of the app',
	},
	{
		name: 'config',
		type: ApplicationCommandType.ChatInput,
		description: 'Configuration commands',
		options: [
			{
				name: 'set',
				type: ApplicationCommandOptionType.SubcommandGroup,
				description: 'Change a setting',
				options: [
					{
						name: 'channel',
						type: ApplicationCommandOptionType.SubcommandGroup,
						description: 'Set a channel',
						options: [
							{
								name: 'pillow',
								type: ApplicationCommandOptionType.Subcommand,
								description: 'Set the pillow submissions channel',
								options: [
									{
										name: 'channel',
										type: ApplicationCommandOptionType.Channel,
										description: 'Channel to be used for pillow submissions',
										required: true,
									},
								],
							},
							{
								name: 'photo',
								type: ApplicationCommandOptionType.Subcommand,
								description: 'Set the Fry-Day group photo channel',
								options: [
									{
										name: 'channel',
										type: ApplicationCommandOptionType.Channel,
										description: 'Channel to be used for pillow submissions',
										required: true,
									},
								],
							},
						],
					},
					{
						name: 'mod',
						type: ApplicationCommandOptionType.Subcommand,
						description: 'Set the image moderator role',
						options: [
							{
								name: 'role',
								type: ApplicationCommandOptionType.Role,
								description: 'Role to be set as image moderator',
							},
						],
					},
				],
			},
		],
	},
	{
		name: 'submit',
		type: ApplicationCommandType.ChatInput,
		description: 'Make a submission',
		options: [
			{
				name: 'pillow',
				type: ApplicationCommandOptionType.Subcommand,
				description: 'Submit your pillow design',
				options: [
					{
						name: 'texture',
						type: ApplicationCommandOptionType.Attachment,
						description: 'The texture for your pillow (png)',
						required: true,
					},
					{
						name: 'name',
						type: ApplicationCommandOptionType.String,
						description: 'Name for your pillow',
						required: true,
					},
					{
						name: 'type',
						type: ApplicationCommandOptionType.String,
						description: 'Type of pillow',
						choices: [
							{
								name: 'Standard',
								value: PillowType.NORMAL,
							},
							{
								name: 'Dakimakura',
								value: PillowType.BODY,
							},
						],
						required: true,
					},
					{
						name: 'username',
						type: ApplicationCommandOptionType.String,
						description: 'Override, defaults to your username',
					},
				],
			},
			{
				name: 'photo',
				type: ApplicationCommandOptionType.Subcommand,
				description: '(not implemented)',
			},
		],
	},
	{
		name: 'upload',
		type: ApplicationCommandType.ChatInput,
		description: 'Upload an image',
		options: [
			{
				name: 'photo',
				type: ApplicationCommandOptionType.Subcommand,
				description: 'Upload a Fry-Day group photo',
				options: [
					{
						name: 'image',
						type: ApplicationCommandOptionType.Attachment,
						description: 'Photo for upload (png)',
						required: true,
					},
					{
						name: 'username',
						type: ApplicationCommandOptionType.String,
						description: 'Override, defaults to your username',
					},
				],
			},
		],
	},
	{
		name: 'list',
		type: ApplicationCommandType.ChatInput,
		description: 'List images',
		options: [
			{
				name: 'pillows',
				type: ApplicationCommandOptionType.Subcommand,
				description: 'List pillows',
			},
			{
				name: 'photos',
				type: ApplicationCommandOptionType.Subcommand,
				description: 'List Fry-Day group photos',
			},
		],
	},
	{
		name: 'delete',
		type: ApplicationCommandType.ChatInput,
		description: 'Delete an image',
		options: [
			{
				name: 'pillow',
				type: ApplicationCommandOptionType.Subcommand,
				description: 'Delete a pillow',
				options: [
					{
						name: 'id',
						type: ApplicationCommandOptionType.String,
						description: 'ID of the pillow to delete',
						required: true,
					},
				],
			},
			{
				name: 'photo',
				type: ApplicationCommandOptionType.Subcommand,
				description: 'Delete a Fry-Day group photo',
				options: [
					{
						name: 'id',
						type: ApplicationCommandOptionType.String,
						description: 'ID of the photo to delete',
						required: true,
					},
				],
			},
		],
	},
];

async function registerGlobalCommands() {
	const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

	try {
		for (const command of commands) {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Bot ${BOT_TOKEN}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(command),
			});
			console.log(`Registered command: ${command.name}`, response);
		}
	} catch (error) {
		console.error('Error registering commands:', error);
	}
}

registerGlobalCommands();
