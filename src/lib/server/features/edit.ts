import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { featureTags, tags } from '$lib/server/db/schema';
import { stringFields } from '$lib/server/forms';
import { resolveLiveExecutor } from '$lib/server/executions/auth';
import { listRecentExecutionsForFeature } from '$lib/server/executions/queries';
import { appendCrumb, type Crumb } from '$lib/breadcrumbs';
import { archiveFeature } from './archive';
import { getFeature } from './queries';
import { saveFeature } from './save';
import { listGroups } from '$lib/server/groups/queries';

type Params = { pid: string; fid: string };

const saveBody = z.object({
  content: z.string().max(200_000),
  version: z.coerce.number().int().nonnegative(),
  groupId: z.string().uuid().nullable().optional(),
});

export const load = async ({ params, parent }: { params: Params; parent: () => Promise<{ breadcrumbs: Crumb[] }> }) => {
  const feature = await getFeature(params.fid);
  if (!feature) throw error(404, 'Feature not found');

  const tagCounts = db.$with('tag_counts').as(
    db
      .select({ tagId: featureTags.tagId, count: sql<number>`COUNT(*)::int`.as('count') })
      .from(featureTags)
      .groupBy(featureTags.tagId),
  );

  const projectTags = await db
    .with(tagCounts)
    .select({
      name:  tags.name,
      count: sql<number>`COALESCE(${tagCounts.count}, 0)`,
    })
    .from(tags)
    .leftJoin(tagCounts, eq(tagCounts.tagId, tags.id))
    .where(eq(tags.projectId, params.pid))
    .orderBy(desc(sql`COALESCE(${tagCounts.count}, 0)`), tags.name);

  const recentRuns = await listRecentExecutionsForFeature(params.fid, 5);
  const { breadcrumbs } = await parent();

  return {
    feature,
    projectTags,
    groups: await listGroups(params.pid),
    recentRuns,
    breadcrumbs: appendCrumb(breadcrumbs, { label: feature.name }),
  };
};

export const actions = {
  save: async (event: RequestEvent<Params>) => {
    const { request, params } = event;
    const data    = stringFields(await request.formData());
    const groupId = data.groupId === '' || data.groupId === undefined ? null : data.groupId;
    const parsed  = saveBody.safeParse({ ...data, groupId });
    if (!parsed.success) return fail(400, { error: parsed.error.message });

    const editor = resolveLiveExecutor(event);

    const result = await saveFeature({
      featureId:       params.fid,
      content:         parsed.data.content,
      expectedVersion: parsed.data.version,
      editor,
      groupId:         parsed.data.groupId ?? null,
    });

    if (result.conflict) {
      return fail(409, { conflict: true, currentFeature: result.currentFeature });
    }

    return { feature: result.feature };
  },

  archive: async ({ params }: RequestEvent<Params>) => {
    const result = await archiveFeature(params.fid);
    if (!result.ok) throw error(404, 'Feature not found');

    throw redirect(303, `/projects/${params.pid}`);
  },
};
