import { json } from '@sveltejs/kit';
import roadmap  from '$lib/data/roadmap.json';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const stripped = {
		version: roadmap.version,
		stamp:   roadmap.stamp,
		items:   roadmap.items
			.filter((i) => i.public && i.status !== 'deferred')
			.map(({ notes: _notes, public: _public, ...rest }) => rest),
	};

	return json(stripped, {
		headers: { 'cache-control': 'public, max-age=300' },
	});
};
