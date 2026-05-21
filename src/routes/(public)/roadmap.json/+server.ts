import { json } from '@sveltejs/kit';
import roadmap  from '$lib/data/roadmap.json';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return json(roadmap, {
		headers: { 'cache-control': 'public, max-age=300' },
	});
};
