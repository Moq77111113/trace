import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { startRun } from '$lib/server/runs/start';
import { stringFields } from '$lib/server/forms';
import type { Actions, PageServerLoad } from './$types';

const startBody = z.object({
  featureId:   z.uuid({ version: 'v7' }),
  executedBy:  z.string().trim().min(1).max(100),
  environment: z.string().trim().max(100).optional(),
});

export const load = (async ({ params }) => ({ projectId: params.pid })) satisfies PageServerLoad;

export const actions = {
  default: async ({ request, params }) => {
    const data   = stringFields(await request.formData());
    const parsed = startBody.safeParse(data);
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues.map((i) => i.message).join('; ') });
    }

    let runId: string;
    try {
      const run = await startRun({
        featureId:   parsed.data.featureId,
        executedBy:  parsed.data.executedBy,
        environment: parsed.data.environment ?? null,
      });
      runId = run.id;
    } catch (e) {
      return fail(409, { error: e instanceof Error ? e.message : 'startRun failed' });
    }

    throw redirect(303, `/projects/${params.pid}/runs/${runId}`);
  },
} satisfies Actions;
