import {
	APIActionRowComponent,
	APIComponentInMessageActionRow,
	APIEmbed,
	APIInteractionResponseCallbackData,
	APIInteractionResponseChannelMessageWithSource,
	InteractionResponseType,
	MessageFlags,
} from 'discord-api-types/v10';

export function messageResponse(content: string, flags?: MessageFlags): APIInteractionResponseChannelMessageWithSource {
	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			content,
			allowed_mentions: { parse: [] },
			flags,
		},
	};
}

export function embedResponse(
	embed: APIEmbed,
	content?: string,
	flags?: MessageFlags,
	components?: APIActionRowComponent<APIComponentInMessageActionRow>[],
	attachment?: { data: ArrayBuffer; filename: string; contentType: string }
): Response {
	const response: APIInteractionResponseChannelMessageWithSource = {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			tts: false,
			content,
			embeds: [embed],
			allowed_mentions: { parse: [] },
			flags,
			components,
		},
	};

	if (attachment) {
		response.data.attachments = [
			{
				id: '0',
				filename: attachment.filename,
			},
		];
	}

	const responseBody = attachment ? new FormData() : undefined;

	if (responseBody && attachment) {
		responseBody.append('payload_json', JSON.stringify(response));
		const file = new Blob([attachment.data], { type: attachment.contentType });
		responseBody.append('files[0]', file, attachment.filename);
		return new Response(responseBody);
	}

	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

export function updateResponse(response: APIInteractionResponseCallbackData): Response {
	return new Response(JSON.stringify({ ...response, type: InteractionResponseType.UpdateMessage }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}
