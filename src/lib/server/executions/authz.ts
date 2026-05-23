import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { attachments, executions, features } from '$lib/server/db/schema';
import type { Action } from '$lib/server/authz/actions';
import type { Authorizer } from '$lib/server/authz/authorizer';

/** Resolves an execution by id and authorizes `action` on its project chain; throws 404 if absent, 403 if not allowed. */
export async function requireExecution(authz: Authorizer, id: string, action: Action) {
  const [hit] = await db
    .select({ execution: executions, projectId: features.projectId })
    .from(executions)
    .innerJoin(features, eq(features.id, executions.featureId))
    .where(eq(executions.id, id));
  if (!hit) throw error(404, 'Execution not found');
  await authz.authorize(action, [
    { kind: 'execution', id: hit.execution.id },
    { kind: 'feature', id: hit.execution.featureId },
    { kind: 'project', id: hit.projectId },
    { kind: 'instance' },
  ]);
  return hit.execution;
}

/** Resolves an attachment by id (attachment → execution → feature → project) and authorizes `action`; throws 404 if absent, 403 if not allowed. */
export async function requireAttachment(authz: Authorizer, id: string, action: Action) {
  const [hit] = await db
    .select({ attachment: attachments, featureId: executions.featureId, projectId: features.projectId })
    .from(attachments)
    .innerJoin(executions, eq(executions.id, attachments.executionId))
    .innerJoin(features, eq(features.id, executions.featureId))
    .where(eq(attachments.id, id));
  if (!hit) throw error(404, 'Attachment not found');
  await authz.authorize(action, [
    { kind: 'execution', id: hit.attachment.executionId },
    { kind: 'feature', id: hit.featureId },
    { kind: 'project', id: hit.projectId },
    { kind: 'instance' },
  ]);
  return hit.attachment;
}
