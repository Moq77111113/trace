import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { startExecution } from '$lib/server/executions/run/start';
import { resolveLiveExecutor } from '$lib/server/executions/executor';
import { stringFields } from '$lib/server/forms';
import { requireFeatureById } from '$lib/server/features/authz';
import type { Actions, PageServerLoad } from './$types';

const startBody = z.object({
  featureId:   z.uuid({ version: 'v7' }),
  environment: z.string().trim().max(100).optional(),
});

export const load = (async ({ parent }) => {
  const { project } = await parent();
  return { projectId: project.id };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const data   = stringFields(await event.request.formData());
    const parsed = startBody.safeParse(data);
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues.map((i) => i.message).join('; ') });
    }

    await requireFeatureById(event.locals.authz, parsed.data.featureId, 'execution.run');

    const executedBy = resolveLiveExecutor(event);

    let executionId: string;
    try {
      const run = await startExecution({
        featureId:   parsed.data.featureId,
        executedBy,
        environment: parsed.data.environment ?? null,
      });
      executionId = run.id;
    } catch (e) {
      return fail(409, { error: e instanceof Error ? e.message : 'startExecution failed' });
    }

    throw redirect(303, `/p/${event.params.slug}/executions/${executionId}`);
  },
} satisfies Actions;
