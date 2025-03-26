import { APIInteractionResponseCallbackData, InteractionResponseType } from 'discord-api-types/v10';

export function updateRequest(response: APIInteractionResponseCallbackData): Request {
	return new Request(JSON.stringify({ ...response, type: InteractionResponseType.UpdateMessage }), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	});
}
