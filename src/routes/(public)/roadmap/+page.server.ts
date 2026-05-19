import roadmap from '$lib/data/roadmap.json';
import type { PageServerLoad } from './$types';

type Status = 'shipped' | 'in-progress' | 'next' | 'later' | 'deferred';

type RoadmapItem = {
	id:      string;
	title:   string;
	status:  Status;
	public:  boolean;
	summary: string;
	notes?:  string;
};

type RoadmapFile = {
	version: number;
	stamp:   string;
	items:   RoadmapItem[];
};

const PUBLIC_ORDER: Status[] = ['in-progress', 'next', 'later', 'shipped'];

export const load = (async () => {
	const data = roadmap as RoadmapFile;

	const publicItems = data.items
		.filter((i) => i.public && i.status !== 'deferred')
		.map(({ notes: _notes, public: _public, ...rest }) => rest);

	const groups = PUBLIC_ORDER
		.map((status) => ({ status, items: publicItems.filter((i) => i.status === status) }))
		.filter((g) => g.items.length > 0);

	return { groups, stamp: data.stamp };
}) satisfies PageServerLoad;
