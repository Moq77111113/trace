import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dismissWelcome } from '$lib/server/onboarding/welcomed';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) return new Response(null, { status: 401 });
	await dismissWelcome(locals.user.id);
	return json({ ok: true });
};
