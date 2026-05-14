import { listFeatures } from '$lib/server/features/queries';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => ({
  features: await listFeatures(params.pid),
})) satisfies PageServerLoad;
