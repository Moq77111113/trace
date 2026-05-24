import roadmap from '$lib/data/roadmap.json';
import type { PageServerLoad } from './$types';

type Status = 'shipped' | 'in-progress' | 'next' | 'later';

type RoadmapItem = {
	id:      string;
	title:   string;
	status:  Status;
	summary: string;
	new?:    boolean;
};

type RoadmapFile = {
	version: number;
	stamp:   string;
	items:   RoadmapItem[];
};

const PUBLIC_ORDER: Status[] = ['in-progress', 'next', 'later', 'shipped'];

const NEW_BAND_LIMIT = 3;

export const load = (async () => {
	const data = roadmap as RoadmapFile;

	const featured    = data.items.filter((i) => i.new === true).slice(0, NEW_BAND_LIMIT);
	const featuredIds = new Set(featured.map((i) => i.id));

	const groups = PUBLIC_ORDER
		.map((status) => ({ status, items: data.items.filter((i) => i.status === status && !featuredIds.has(i.id)) }))
		.filter((g) => g.items.length > 0);

	return { featured, groups, stamp: data.stamp };
}) satisfies PageServerLoad;
