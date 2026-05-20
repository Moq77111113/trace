import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { featureTags, features, projects, tags } from '$lib/server/db/schema';
import { stringFields } from '$lib/server/forms';
import { resolveLiveExecutor } from '$lib/server/executions/auth';
import { listRecentExecutionsForFeature } from '$lib/server/executions/queries';
import { appendCrumb, type Crumb } from '$lib/shared/lib/breadcrumbs';
import { parseFeatureCode } from '$lib/shared/lib/slug';
import { archiveFeature } from './archive';
import { getFeatureByCode } from './queries';
import { saveFeature } from './save';
import { listGroups } from '$lib/server/groups/queries';
import {
  addManualScenario,
  archiveManualScenario,
  listManualScenarios,
  renameManualScenario,
  reorderManualScenarios,
} from './manual-scenarios';

type Params = { slug: string; code: string };
type ProjectRef = { id: string; slug: string; codePrefix: string };
type ParentData = { breadcrumbs: Crumb[]; project: ProjectRef };

export const load = async ({ params, parent }: { params: Params; parent: () => Promise<ParentData> }) => {
  const { project, breadcrumbs } = await parent();

  const parsed = parseFeatureCode(params.code);
  if (!parsed || parsed.prefix !== project.codePrefix) throw error(404, 'Feature not found');

  const feature = await getFeatureByCode(project.id, parsed.seq);
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
    .where(eq(tags.projectId, project.id))
    .orderBy(desc(sql`COALESCE(${tagCounts.count}, 0)`), tags.name);

  const recentRuns = await listRecentExecutionsForFeature(feature.id, 5);

  return {
    feature,
    projectTags,
    groups: await listGroups(project.id),
    recentRuns,
    manualScenarios: await listManualScenarios({ featureId: feature.id }),
    breadcrumbs: appendCrumb(breadcrumbs, { label: feature.name }),
  };
};

export async function addManualScenarioAction(input: { featureId: string; name: string }) {
  const scenario = await addManualScenario(input);
  return { scenario };
}

export async function renameManualScenarioAction(input: { scenarioId: string; name: string }) {
  const scenario = await renameManualScenario(input);
  return { scenario };
}

export async function archiveManualScenarioAction(input: { scenarioId: string }) {
  await archiveManualScenario(input);
  return { ok: true as const };
}

export async function reorderManualScenariosAction(input: { featureId: string; order: string[] }) {
  await reorderManualScenarios(input);
  return { ok: true as const };
}

const saveBody = z.object({
  content: z.string().max(200_000),
  version: z.coerce.number().int().nonnegative(),
  groupId: z.string().uuid().nullable().optional(),
});

async function resolveFeatureId(slug: string, code: string): Promise<string | null> {
  const parsed = parseFeatureCode(code);
  if (!parsed) return null;
  const [row] = await db
    .select({ id: features.id })
    .from(features)
    .innerJoin(projects, eq(projects.id, features.projectId))
    .where(and(eq(projects.slug, slug), eq(projects.codePrefix, parsed.prefix), eq(features.codeSeq, parsed.seq)));
  return row?.id ?? null;
}

export const actions = {
  save: async (event: RequestEvent<Params>) => {
    const { request, params } = event;
    const data    = stringFields(await request.formData());
    const groupId = data.groupId === '' || data.groupId === undefined ? null : data.groupId;
    const parsed  = saveBody.safeParse({ ...data, groupId });
    if (!parsed.success) return fail(400, { error: parsed.error.message });

    const featureId = await resolveFeatureId(params.slug, params.code);
    if (!featureId) throw error(404, 'Feature not found');

    const editor = resolveLiveExecutor(event);

    const result = await saveFeature({
      featureId,
      content:         parsed.data.content,
      description:     null,
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
    const featureId = await resolveFeatureId(params.slug, params.code);
    if (!featureId) throw error(404, 'Feature not found');

    const archived = await archiveFeature(featureId);
    if (!archived.ok) throw error(404, 'Feature not found');

    throw redirect(303, `/p/${params.slug}`);
  },

  addManualScenario: async ({ request }: RequestEvent<Params>) => {
    const data = await request.formData();
    return addManualScenarioAction({
      featureId: String(data.get('featureId') ?? ''),
      name:      String(data.get('name') ?? ''),
    });
  },

  renameManualScenario: async ({ request }: RequestEvent<Params>) => {
    const data = await request.formData();
    return renameManualScenarioAction({
      scenarioId: String(data.get('scenarioId') ?? ''),
      name:       String(data.get('name') ?? ''),
    });
  },

  archiveManualScenario: async ({ request }: RequestEvent<Params>) => {
    const data = await request.formData();
    return archiveManualScenarioAction({
      scenarioId: String(data.get('scenarioId') ?? ''),
    });
  },

  reorderManualScenarios: async ({ request }: RequestEvent<Params>) => {
    const data  = await request.formData();
    const order = String(data.get('order') ?? '').split(',').filter(Boolean);
    return reorderManualScenariosAction({
      featureId: String(data.get('featureId') ?? ''),
      order,
    });
  },
};
