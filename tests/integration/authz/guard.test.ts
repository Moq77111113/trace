import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import { makeGuard } from '$lib/server/authz/guard';
import { mkProject, mkUser } from '$testing/fixtures';

const asUser = (id: string) => ({ id, email: 'u@test.local', name: null, role: 'user' as const, welcomedAt: null });

describe('guard.project', () => {
  it('returns the project when an allow policy matches', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await db.insert(policies).values({
      subjectKind: 'user', subjectId: u.id, action: 'project.access',
      scopeKind: 'project', scopeId: p.id, effect: 'allow',
    });

    const project = await makeGuard(asUser(u.id)).project('project.access', p.slug);
    expect(project.id).toBe(p.id);
  });

  it('throws 403 when no policy matches', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await expect(makeGuard(asUser(u.id)).project('project.access', p.slug)).rejects.toMatchObject({ status: 403 });
  });

  it('throws 404 for an unknown slug (before authorizing)', async () => {
    const u = await mkUser();
    await expect(makeGuard(asUser(u.id)).project('project.access', 'no-such-slug')).rejects.toMatchObject({ status: 404 });
  });

  it('denies an anonymous request to an existing project', async () => {
    const p = await mkProject();
    await expect(makeGuard(null).project('project.access', p.slug)).rejects.toMatchObject({ status: 403 });
  });
});
