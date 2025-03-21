import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';

export enum PillowType {
	NORMAL = 'Normal',
	BODY = 'Dakimakura',
}
export type PillowData = {
	discordApproverId: string;
	discordUserId: string;
	pillowName: string;
	pillowType: PillowType;
	submittedAt: string;
	userName: string;
};
export type PhotoData = {
	date: string;
	discordUserId: string;
	key: string;
	submittedAt: string;
	userName: string;
};
export type Settings = {
	modRoleId: string;
	photoChannelId: string;
	pillowChannelId: string;
};
export type Command = {
	name: string;
	type: ApplicationCommandType;
	description: string;
	options?: CommandOption[];
};
type CommandOption = {
	name: string;
	type: ApplicationCommandOptionType;
	description: string;
	required?: boolean;
	choices?: choice[];
	options?: CommandOption[];
};
type choice = {
	name: string;
	value: string;
};
