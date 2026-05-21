import { error, fail, redirect } from '@sveltejs/kit';
import { stringFields } from '$lib/server/forms';
import { resolveLiveExecutor } from '$lib/server/executions/executor';
import { listRecentExecutionsForFeature } from '$lib/server/executions/read/queries';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import { parseFeatureCode } from '$lib/shared/lib/slug';
import { archiveFeature } from '$lib/server/features/lifecycle/archive';
import {
  getFeatureByCode,
  listProjectTags,
  resolveFeatureIdByCode,
} from '$lib/server/features/read/queries';
import { featureSaveBody, saveFeature } from '$lib/server/features/lifecycle/save';
import { listGroups } from '$lib/server/groups/queries';
import {
  addInput,
  addManualScenario,
  archiveInput,
  archiveManualScenario,
  listManualScenarios,
  ManualScenarioNameTakenError,
  renameInput,
  renameManualScenario,
  reorderInput,
  reorderManualScenarios,
} from '$lib/server/features/manual-scenarios';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const { project, breadcrumbs } = await parent();

  const parsed = parseFeatureCode(params.code);
  if (!parsed || parsed.prefix !== project.codePrefix) throw error(404, 'Feature not found');

  const feature = await getFeatureByCode(project.id, parsed.seq);
  if (!feature) throw error(404, 'Feature not found');

  return {
    feature,
    projectTags:     await listProjectTags(project.id),
    groups:          await listGroups(project.id),
    recentRuns:      await listRecentExecutionsForFeature(feature.id, 5),
    manualScenarios: await listManualScenarios({ featureId: feature.id }),
    breadcrumbs:     appendCrumb(breadcrumbs, { label: feature.name }),
  };
}) satisfies PageServerLoad;

function mapManualNameTakenToFail(e: unknown) {
  if (e instanceof ManualScenarioNameTakenError) {
    return fail(409, {
      reason: e.conflictWith === 'gherkin'
        ? 'name-taken-gherkin' as const
        : 'name-taken-manual'  as const,
    });
  }
  return null;
}

export const actions = {
  save: async (event) => {
    const data    = stringFields(await event.request.formData());
    const groupId = data.groupId === '' || data.groupId === undefined ? null : data.groupId;
    const parsed  = featureSaveBody.safeParse({ ...data, groupId });
    if (!parsed.success) return fail(400, { error: parsed.error.message });

    const featureId = await resolveFeatureIdByCode(event.params.slug, event.params.code);
    if (!featureId) throw error(404, 'Feature not found');

    const trimmedDescription = parsed.data.description.trim();
    const result = await saveFeature({
      featureId,
      content:         parsed.data.content,
      description:     trimmedDescription === '' ? null : trimmedDescription,
      expectedVersion: parsed.data.version,
      editor:          resolveLiveExecutor(event),
      groupId:         parsed.data.groupId ?? null,
    });

    if (!result.ok) {
      if (result.reason === 'version-conflict') {
        return fail(409, { conflict: true, currentFeature: result.currentFeature });
      }
      return fail(409, { nameCollisions: result.collisions });
    }
    return { feature: result.feature };
  },

  archive: async ({ params }) => {
    const featureId = await resolveFeatureIdByCode(params.slug, params.code);
    if (!featureId) throw error(404, 'Feature not found');

    const archived = await archiveFeature(featureId);
    if (!archived.ok) throw error(404, 'Feature not found');

    throw redirect(303, `/p/${params.slug}`);
  },

  addManualScenario: async ({ request }) => {
    const data   = stringFields(await request.formData());
    const parsed = addInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'addManualScenario' });
    try {
      const scenario = await addManualScenario(parsed.data);
      return { scenario };
    } catch (e) {
      const failure = mapManualNameTakenToFail(e);
      if (failure) return failure;
      throw e;
    }
  },

  renameManualScenario: async ({ request }) => {
    const data   = stringFields(await request.formData());
    const parsed = renameInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'renameManualScenario' });
    try {
      const scenario = await renameManualScenario(parsed.data);
      return { scenario };
    } catch (e) {
      const failure = mapManualNameTakenToFail(e);
      if (failure) return failure;
      throw e;
    }
  },

  archiveManualScenario: async ({ request }) => {
    const data   = stringFields(await request.formData());
    const parsed = archiveInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'archiveManualScenario' });
    await archiveManualScenario(parsed.data);
    return { ok: true as const };
  },

  reorderManualScenarios: async ({ request }) => {
    const data   = stringFields(await request.formData());
    const order  = (data.order ?? '').split(',').filter(Boolean);
    const parsed = reorderInput.safeParse({ featureId: data.featureId, order });
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'reorderManualScenarios' });
    await reorderManualScenarios(parsed.data);
    return { ok: true as const };
  },
} satisfies Actions;
