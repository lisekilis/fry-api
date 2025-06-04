// Get command-line arguments
const args = process.argv.slice(2);
const APPLICATION_ID = args[0];
const BOT_TOKEN = args[1];

// import commands from the commands directory
const commandDir = './src/discord/commands';
import { readdirSync } from 'node:fs';
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
const commandFiles = readdirSync(commandDir).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
import { resolve, join } from 'node:path';
const commands: RESTPostAPIApplicationCommandsJSONBody[] = commandFiles
	.filter((file) => file !== 'index.ts' && file !== 'index.js')
	.flatMap((file) => {
		const commandModule = require(resolve(join(commandDir, file)));
		if (!commandModule.default || typeof commandModule.default !== 'object') {
			console.warn(`Skipping ${file}: does not export a valid default command object`);
			return [];
		}
		const cmd = commandModule.default;
		delete cmd.subcommands;
		delete cmd.subcommandGroups;
		delete cmd.execute;
		try {
			validateCommandNames(cmd, [file]);
		} catch (e) {
			if (e instanceof Error) {
				console.error(e.message);
			} else {
				console.error('Unknown error during command validation:', e);
			}
			return [];
		}
		return cmd as RESTPostAPIApplicationCommandsJSONBody;
	});

function isValidCommandName(name: string): boolean {
	return /^[-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u.test(name) && name === name.toLowerCase();
}

function validateCommandNames(obj: any, path: string[] = []) {
	if (obj && typeof obj === 'object') {
		if ('name' in obj && !Array.isArray(obj.choices)) {
			// Only validate name if not inside a choices array
			if (!isValidCommandName(obj.name)) {
				throw new Error(
					`Invalid command name at ${[...path, obj.name].join('.')} - '${
						obj.name
					}'. Command, subcommand, and option names must be lowercase, 1-32 chars, and only contain letters, numbers, underscores, or dashes.`
				);
			}
		}
		for (const key of Object.keys(obj)) {
			if (key === 'choices' && Array.isArray(obj[key])) {
				// Skip validation for choices[].name
				continue;
			}
			if (Array.isArray(obj[key])) {
				obj[key].forEach((item: any, idx: number) => validateCommandNames(item, [...path, obj.name || key, key, String(idx)]));
			} else if (typeof obj[key] === 'object' && obj[key] !== null) {
				validateCommandNames(obj[key], [...path, obj.name || key, key]);
			}
		}
	}
}

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
	console.log(`Total commands to register: ${commands.length}`);

	try {
		const response = await fetch(url, {
			method: 'PUT',
			headers: {
				Authorization: `Bot ${BOT_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(commands),
		});
		if (response.status !== 200 && response.status !== 201)
			throw new Error(`Failed to register commands, Status: ${response.status}, response: ${await response.text()}`);

		console.log(`Successfully registered ${commands.length} commands`);
	} catch (error) {
		console.error('Error registering commands:', error);
		process.exit(1);
	}
}

registerGlobalCommands();
