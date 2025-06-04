import { verifyKey } from 'discord-interactions';
import commands from './commands';
import { APIInteraction } from 'discord-api-types/v10';

export default async function (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const publicKey = env.DISCORD_PUBLIC_KEY.get();
	const signature = request.headers.get('X-Signature-Ed25519');
	const timestamp = request.headers.get('X-Signature-Timestamp');
	const body = await request.text();
	if (!signature || !timestamp || !verifyKey(body, signature, timestamp, await publicKey))
		return new Response('Unauthorized', { status: 401 });

	const interaction = JSON.parse(body) as APIInteraction;

	return await commands(interaction, env, ctx);
}
