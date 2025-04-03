import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';
import { Command, PillowType } from './types';

// Get command-line arguments
const args = process.argv.slice(2);
const APPLICATION_ID = args[0];
const BOT_TOKEN = args[1];

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
			{
				name: 'global',
				type: ApplicationCommandOptionType.SubcommandGroup,
				description: 'Set a global setting',
				options: [
					{
						name: 'whitelist',
						type: ApplicationCommandOptionType.Subcommand,
						description: 'Set the whitelist for the bot',
						options: [
							{
								name: 'guild',
								type: ApplicationCommandOptionType.String,
								description: 'Guild to whitelist',
							},
							{
								name: 'name',
								type: ApplicationCommandOptionType.String,
								description: 'Name of the guild',
							},
							{
								name: 'toggle',
								type: ApplicationCommandOptionType.Boolean,
								description: 'Add or remove the guild from the whitelist',
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
						name: 'date',
						type: ApplicationCommandOptionType.String,
						description: 'Date of the photo (any string accepted by the Date() constructor, defaults to last friday)',
						required: false,
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
				options: [
					{
						name: 'type',
						type: ApplicationCommandOptionType.String,
						description: 'Type of pillows to list',
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
					},
					{
						name: 'user',
						type: ApplicationCommandOptionType.User,
						description: 'User to list pillows for',
					},
					{
						name: 'random',
						type: ApplicationCommandOptionType.Boolean,
						description: 'Randomize the order of the pillows',
					},
					{
						name: 'count',
						type: ApplicationCommandOptionType.Integer,
						description: 'Number of pillows to list',
						choices: [
							{ name: '1', value: '1' },
							{ name: '5', value: '5' },
							{ name: '10', value: '10' },
							{ name: '25', value: '25' },
						],
					},
				],
			},
			{
				name: 'photos',
				type: ApplicationCommandOptionType.Subcommand,
				description: 'List Fry-Day group photos',
				options: [
					{
						name: 'type',
						type: ApplicationCommandOptionType.String,
						description: 'Type of pillows to list',
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
					},
					{
						name: 'user',
						type: ApplicationCommandOptionType.User,
						description: 'User to list pillows for',
					},
					{
						name: 'random',
						type: ApplicationCommandOptionType.Boolean,
						description: 'Randomize the order of the pillows',
					},
					{
						name: 'count',
						type: ApplicationCommandOptionType.Integer,
						description: 'Number of pillows to list',
						choices: [
							{ name: '1', value: '1' },
							{ name: '5', value: '5' },
							{ name: '10', value: '10' },
							{ name: '25', value: '25' },
						],
					},
				],
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
	{
		name: 'view',
		type: ApplicationCommandType.ChatInput,
		description: 'View an image',
		options: [
			{
				name: 'pillow',
				type: ApplicationCommandOptionType.Subcommand,
				description: 'View a pillow',
				options: [
					{
						name: 'user',
						type: ApplicationCommandOptionType.User,
						description: 'User to view pillows for',
					},
					{
						name: 'type',
						type: ApplicationCommandOptionType.String,
						description: 'Type of pillows to view',
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
					},
					{
						name: 'id',
						type: ApplicationCommandOptionType.String,
						description: 'ID of the pillow to view',
					},
				],
			},
			{
				name: 'photo',
				type: ApplicationCommandOptionType.Subcommand,
				description: 'View a Fry-Day group photo',
				options: [
					{
						name: 'id',
						type: ApplicationCommandOptionType.String,
						description: 'ID of the photo to view',
					},
				],
			},
		],
	},
];

async function deleteAllCommands() {
	const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;
	console.log(`Removing all existing commands from ${url}`);

	try {
		const response = await fetch(url, {
			method: 'PUT', // PUT with empty array overwrites all commands
			headers: {
				Authorization: `Bot ${BOT_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify([]), // Empty array to replace all commands
		});

		if (response.ok) {
			console.log('Successfully cleared all existing commands');
		} else {
			console.error(`Failed to clear commands: Status: ${response.status}, response: ${await response.text()}`);
		}
	} catch (error) {
		console.error('Error clearing commands:', error);
	}
}

async function registerGlobalCommands() {
	// First, delete all existing commands
	await deleteAllCommands();

	const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;
	console.log(`Registering commands to ${url}`);

	try {
		const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

		for (const command of commands) {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Bot ${BOT_TOKEN}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(command),
			});
			if (response.status !== 200 && response.status !== 201) {
				throw new Error(`Failed to register command: ${command.name}, Status: ${response.status}, response: ${await response.text()}`);
			}
			console.log(`Registered command: ${command.name}`);

			// bruh moment rate limited
			await delay(1000);
		}
	} catch (error) {
		console.error('Error registering commands:', error);
		process.exit(1); // Exit the process with a failure code
	}
}

registerGlobalCommands();
