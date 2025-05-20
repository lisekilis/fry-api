import {
	APIInteraction,
	InteractionType,
	APIChatInputApplicationCommandGuildInteraction,
	InteractionResponseType,
	MessageFlags,
} from 'discord-api-types/v10';
import { messageResponse } from '../discord/responses';
import { handleApplicationCommand } from '../discord/index';
import { handleMessageComponent } from '../discord/components';
import { verifyKey } from 'discord-interactions';
import { isGuildInteraction } from 'discord-api-types/utils';
import { verifyWhitelist } from '../discord/util';

// Discord webhook handler
export async function handleDiscordInteractions(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const publicKey = env.DISCORD_PUBLIC_KEY.get();

	// Verify the request is from Discord
	const signature = request.headers.get('X-Signature-Ed25519');
	const timestamp = request.headers.get('X-Signature-Timestamp');

	if (!signature || !timestamp) {
		return new Response('Missing signature or timestamp', { status: 401 });
	}

	// Get the raw body
	const rawBody = await request.clone().text();

	// Verify the request signature
	if (!(await verifyKey(rawBody, signature, timestamp, await publicKey))) {
		return new Response('Bad request signature', { status: 401 });
	}

	// Parse the interaction
	const interaction: APIInteraction = JSON.parse(rawBody);

	// verify whitelist
	if (!verifyWhitelist(interaction, env)) {
		return messageResponse('Guild not whitelisted', MessageFlags.Ephemeral);
	}

	// Handle different interaction types
	switch (interaction.type) {
		case InteractionType.Ping:
			return new Response(
				JSON.stringify({
					type: InteractionResponseType.Pong,
				}),
				{ headers: { 'Content-Type': 'application/json' } }
			);

		case InteractionType.ApplicationCommand:
			if (isGuildInteraction(interaction)) {
				return await handleApplicationCommand(interaction as APIChatInputApplicationCommandGuildInteraction, env, ctx);
			}
			return messageResponse('Invalid interaction type or missing guild_id');

		case InteractionType.MessageComponent:
			return await handleMessageComponent(interaction, env, ctx);

		default:
			return messageResponse(`Interaction type not supported: ${interaction.type}`);
	}
}
