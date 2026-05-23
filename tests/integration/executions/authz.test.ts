import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { attachments, executions } from '$lib/server/db/schema';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { requireAttachment, requireExecution } from '$lib/server/executions/authz';
import { grantProjectAccess, mkFeature, mkProject, mkUser } from '$testing/fixtures';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

async function seedExec(uId: string) {
  const p = await mkProject();
  const f = await mkFeature(p.id);
  const [exec] = await db.insert(executions).values({
    featureId: f.id, source: 'MANUAL', executedBy: uId, featureContentAtStart: f.content, status: 'IN_PROGRESS',
  }).returning();
  return { p, f, exec };
}

describe('executions/authz', () => {
  it('requireExecution cascades a project grant; 403 without; 404 unknown', async () => {
    const u = await mkUser();
    const { p, exec } = await seedExec(u.id);
    await grantProjectAccess(u.id, p.id, 'execution.review');
    expect((await requireExecution(makeAuthorizer(asUser(u.id)), exec.id, 'execution.review')).id).toBe(exec.id);

    const other = await mkUser();
    await expect(requireExecution(makeAuthorizer(asUser(other.id)), exec.id, 'execution.review')).rejects.toMatchObject({ status: 403 });
    await expect(requireExecution(makeAuthorizer(asUser(u.id)), '00000000-0000-7000-8000-000000000000', 'execution.review')).rejects.toMatchObject({ status: 404 });
  });

  it('requireAttachment resolves via its execution', async () => {
    const u = await mkUser();
    const { p, exec } = await seedExec(u.id);
    const [att] = await db.insert(attachments).values({
      executionId: exec.id, filename: 'a.txt', mimeType: 'text/plain', sizeBytes: 3, storageKey: 'k', uploadedBy: u.id,
    }).returning();
    await grantProjectAccess(u.id, p.id, 'execution.review');
    expect((await requireAttachment(makeAuthorizer(asUser(u.id)), att.id, 'execution.review')).id).toBe(att.id);
    await expect(requireAttachment(makeAuthorizer(asUser(u.id)), '00000000-0000-7000-8000-000000000000', 'execution.review')).rejects.toMatchObject({ status: 404 });
  });
});
