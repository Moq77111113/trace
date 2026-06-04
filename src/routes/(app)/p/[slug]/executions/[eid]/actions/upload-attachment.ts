import { fail, type RequestEvent } from '@sveltejs/kit';
import { uploadAttachment } from '$lib/server/executions/scenario/upload-attachment';
import { requireExecution } from '$lib/server/executions/authz';
import { failureFor } from './failure';

type Params = { slug: string; eid: string };

export async function uploadAttachmentAction({ request, params, locals }: RequestEvent<Params>) {
  await requireExecution(locals.authz, params.eid, 'execution.run');
  const form             = await request.formData();
  const scenarioResultId = form.get('scenarioResultId');
  const scenarioResultStepId = form.get('scenarioResultStepId');
  const stepId = typeof scenarioResultStepId === 'string' && scenarioResultStepId.length > 0 ? scenarioResultStepId : null;
  const files            = form.getAll('files').filter((v): v is File => v instanceof File && v.size > 0);

  if (typeof scenarioResultId !== 'string') return fail(400, { error: 'scenarioResultId required' });
  if (files.length === 0)                    return fail(400, { error: 'at least one non-empty file required' });

  const uploaded: Awaited<ReturnType<typeof uploadAttachment>>[] = [];
  for (const file of files) {
    try {
      const row = await uploadAttachment({
        executionId:      params.eid,
        scenarioResultId,
        scenarioResultStepId: stepId,
        filename:         file.name,
        mimeType:         file.type || 'application/octet-stream',
        body:             Buffer.from(await file.arrayBuffer()),
      });
      uploaded.push(row);
    } catch (e) {
      return failureFor(e);
    }
  }
  return { uploaded };
}
