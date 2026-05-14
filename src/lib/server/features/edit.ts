import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { featureTags, tags } from '$lib/server/db/schema';
import { stringFields } from '$lib/server/forms';
import { getFeature } from './queries';
import { saveFeature } from './save';

type Params = { pid: string; fid: string };

const saveBody = z.object({
  content: z.string().max(200_000),
  version: z.coerce.number().int().nonnegative(),
  editor:  z.string().trim().max(100).optional(),
});

export const load = async ({ params }: { params: Params }) => {
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

  return { feature, projectTags };
};

export const actions = {
  save: async ({ request, params }: RequestEvent<Params>) => {
    const data   = stringFields(await request.formData());
    const parsed = saveBody.safeParse(data);
    if (!parsed.success) return fail(400, { error: parsed.error.message });

    const editor = parsed.data.editor && parsed.data.editor.length > 0
      ? parsed.data.editor
      : 'anonymous';

    const result = await saveFeature({
      featureId:       params.fid,
      content:         parsed.data.content,
      expectedVersion: parsed.data.version,
      editor,
    });

    if (result.conflict) {
      return fail(409, { conflict: true, currentFeature: result.currentFeature });
    }

    return { feature: result.feature };
  },
};
