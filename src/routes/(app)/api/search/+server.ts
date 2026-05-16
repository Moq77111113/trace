import { error, json } from '@sveltejs/kit';
import { searchFeatures } from '$lib/server/search/queries';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) throw error(401, 'unauthorized');
	const q = url.searchParams.get('q') ?? '';
	const results = await searchFeatures(q);
	return json({ results });
};
