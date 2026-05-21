import { json } from '@sveltejs/kit';
import { searchFeatures } from '$lib/server/search/queries';
import { authedHandler } from '$lib/server/route';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = authedHandler(async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const results = await searchFeatures(q);
	return json({ results });
});
