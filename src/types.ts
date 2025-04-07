import { APIInteractionResponse, ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';

export enum PillowType {
	NORMAL = 'Normal',
	BODY = 'Dakimakura',
}

// Fix typo: 'bame' -> 'name'
export type PillowData = {
	approverId: string;
	userId: string;
	name: string; // Fixed from 'bame'
	type: PillowType;
	submittedAt: string;
	userName: string;
};

export type PhotoData = {
	date: string;
	userId: string;
	submittedAt: string;
	userName: string;
};

// R2 HTTP Metadata type
export interface R2HTTPMetadata {
	contentType?: string;
	contentLanguage?: string;
	contentDisposition?: string;
	contentEncoding?: string;
	cacheControl?: string;
	cacheExpiry?: Date;
}

// Generic R2Object type
export interface R2Object<T = Record<string, unknown>> {
	key: string;
	size: number;
	etag: string;
	httpEtag: string;
	uploaded: Date;
	httpMetadata?: R2HTTPMetadata;
	customMetadata?: T;
}

// Typed R2Objects collection
export interface R2Objects<T = Record<string, unknown>> {
	objects: R2Object<T>[];
	truncated: boolean;
	cursor?: string;
	delimitedPrefixes?: string[];
}

// Specific types for Pillow and Photo objects
export type PillowR2Object = R2Object<PillowData>;
export type PhotoR2Object = R2Object<PhotoData>;

// Specific collections
export type PillowR2Objects = R2Objects<PillowData>;
export type PhotoR2Objects = R2Objects<PhotoData>;

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
