import { listRunsForProject } from '$lib/server/runs/queries';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => ({
  runs: await listRunsForProject(params.pid),
})) satisfies PageServerLoad;
