import { fail, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { requireProject } from '$lib/server/projects/authz';
import { getManualPreview, dropManualPreview } from '$lib/server/import/manual/buffer';
import { commitManualImport, scenarioDecisionSchema } from '$lib/server/import/manual/commit';

type Params = { slug: string };

const bodySchema = z.object({
  previewId:        z.string().min(1),
  groupingField:    z.enum(['folder', 'component', 'issue', 'fixed']),
  fixedFeatureName: z.string().trim().min(1).max(200).optional(),
  decisions:        z.record(z.string(), scenarioDecisionSchema).default({}),
});

/** Commit a buffered manual import using the client's grouping choice and per-scenario decisions. */
export async function manualCommit({ request, params, locals }: RequestEvent<Params>) {
  const project = await requireProject(locals.authz, params.slug, 'feature.author');

  const raw = await request.formData();
  const decisionsRaw = raw.get('decisions');

  let decisionsParsed: unknown;
  try {
    decisionsParsed = JSON.parse(typeof decisionsRaw === 'string' ? decisionsRaw : '{}');
  } catch {
    return fail(400, { error: 'decisions must be valid JSON' });
  }

  const parsed = bodySchema.safeParse({
    previewId:        raw.get('previewId'),
    groupingField:    raw.get('groupingField'),
    fixedFeatureName: raw.get('fixedFeatureName') ?? undefined,
    decisions:        decisionsParsed,
  });
  if (!parsed.success) return fail(400, { error: 'invalid input' });

  const entry = getManualPreview(parsed.data.previewId);
  if (!entry || entry.projectId !== project.id) return fail(410, { error: 'preview expired, re-upload the file' });

  const outcome = await commitManualImport({
    projectId:        project.id,
    ir:               entry.ir,
    groupingField:    parsed.data.groupingField,
    fixedFeatureName: parsed.data.fixedFeatureName,
    decisions:        parsed.data.decisions,
  });

  dropManualPreview(parsed.data.previewId);
  return { manualOutcome: outcome };
}
