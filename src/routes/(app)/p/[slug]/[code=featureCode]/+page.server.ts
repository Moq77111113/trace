import { fail, redirect } from '@sveltejs/kit';
import { stringFields } from '$lib/server/forms';
import { resolveLiveExecutor } from '$lib/server/executions/executor';
import { listRecentExecutionsForFeature } from '$lib/server/executions/read/queries';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import { archiveFeature } from '$lib/server/features/lifecycle/archive';
import { listProjectTags } from '$lib/server/features/read/queries';
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
import { requireFeature } from '$lib/server/features/authz';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ params, parent, locals }) => {
  const { breadcrumbs } = await parent();
  const feature = await requireFeature(locals.authz, params.slug, params.code, 'feature.view');

  return {
    feature,
    projectTags:     await listProjectTags(feature.projectId),
    groups:          await listGroups(feature.projectId),
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
    const feature = await requireFeature(event.locals.authz, event.params.slug, event.params.code, 'feature.author');

    const data    = stringFields(await event.request.formData());
    const groupId = data.groupId === '' || data.groupId === undefined ? null : data.groupId;
    const parsed  = featureSaveBody.safeParse({ ...data, groupId });
    if (!parsed.success) return fail(400, { error: parsed.error.message });

    const trimmedDescription = parsed.data.description.trim();
    const result = await saveFeature({
      featureId:       feature.id,
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

  archive: async ({ params, locals }) => {
    const feature = await requireFeature(locals.authz, params.slug, params.code, 'feature.author');

    const archived = await archiveFeature(feature.id);
    if (!archived.ok) throw { status: 404 };

    throw redirect(303, `/p/${params.slug}`);
  },

  addManualScenario: async ({ request, params, locals }) => {
    await requireFeature(locals.authz, params.slug, params.code, 'feature.author');

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

  renameManualScenario: async ({ request, params, locals }) => {
    await requireFeature(locals.authz, params.slug, params.code, 'feature.author');

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

  archiveManualScenario: async ({ request, params, locals }) => {
    await requireFeature(locals.authz, params.slug, params.code, 'feature.author');

    const data   = stringFields(await request.formData());
    const parsed = archiveInput.safeParse(data);
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'archiveManualScenario' });
    await archiveManualScenario(parsed.data);
    return { ok: true as const };
  },

  reorderManualScenarios: async ({ request, params, locals }) => {
    await requireFeature(locals.authz, params.slug, params.code, 'feature.author');

    const data   = stringFields(await request.formData());
    const order  = (data.order ?? '').split(',').filter(Boolean);
    const parsed = reorderInput.safeParse({ featureId: data.featureId, order });
    if (!parsed.success) return fail(400, { error: 'invalid-input', action: 'reorderManualScenarios' });
    await reorderManualScenarios(parsed.data);
    return { ok: true as const };
  },
} satisfies Actions;
