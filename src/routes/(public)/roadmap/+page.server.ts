import roadmap from '$lib/data/roadmap.json';
import type { PageServerLoad } from './$types';

type Status = 'shipped' | 'in-progress' | 'next' | 'later';

type RoadmapItem = {
	id:      string;
	title:   string;
	status:  Status;
	summary: string;
};

type RoadmapFile = {
	version: number;
	stamp:   string;
	items:   RoadmapItem[];
};

const PUBLIC_ORDER: Status[] = ['in-progress', 'next', 'later', 'shipped'];

export const load = (async () => {
	const data = roadmap as RoadmapFile;

	const groups = PUBLIC_ORDER
		.map((status) => ({ status, items: data.items.filter((i) => i.status === status) }))
		.filter((g) => g.items.length > 0);

	return { groups, stamp: data.stamp };
}) satisfies PageServerLoad;
