import { listProjectsWithStats, listRecentRuns } from '$lib/server/projects/queries';
import type { PageServerLoad } from './$types';

export const load = (async () => ({
  projects:   await listProjectsWithStats(),
  recentRuns: await listRecentRuns(20),
})) satisfies PageServerLoad;
