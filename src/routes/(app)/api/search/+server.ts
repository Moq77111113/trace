import { json } from '@sveltejs/kit';
import { searchFeatures } from '$lib/server/search/queries';
import { authedHandler } from '$lib/server/route';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = authedHandler(async ({ url, locals }) => {
	const q = url.searchParams.get('q') ?? '';
	const results = await searchFeatures(locals.authz, q);
	return json({ results });
});
