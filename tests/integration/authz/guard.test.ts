import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import { makeGuard } from '$lib/server/authz/guard';
import { mkFeature, mkProject, mkUser } from '$testing/fixtures';

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

describe('guard.feature', () => {
  it('cascades a project-scoped grant to a feature action and returns the feature', async () => {
    const u = await mkUser();
    const p = await mkProject();
    const f = await mkFeature(p.id);
    await db.insert(policies).values({
      subjectKind: 'user', subjectId: u.id, action: 'feature.view',
      scopeKind: 'project', scopeId: p.id, effect: 'allow',
    });

    const code = `${p.codePrefix}-${f.codeSeq}`;
    const feature = await makeGuard(asUser(u.id)).feature('feature.view', p.slug, code);
    expect(feature.id).toBe(f.id);
  });

  it('throws 403 when the grant covers a different action', async () => {
    const u = await mkUser();
    const p = await mkProject();
    const f = await mkFeature(p.id);
    await db.insert(policies).values({
      subjectKind: 'user', subjectId: u.id, action: 'feature.view',
      scopeKind: 'project', scopeId: p.id, effect: 'allow',
    });
    const code = `${p.codePrefix}-${f.codeSeq}`;
    await expect(makeGuard(asUser(u.id)).feature('feature.author', p.slug, code)).rejects.toMatchObject({ status: 403 });
  });

  it('throws 404 for an unknown code', async () => {
    const u = await mkUser();
    const p = await mkProject();
    await expect(makeGuard(asUser(u.id)).feature('feature.view', p.slug, `${p.codePrefix}-9999`)).rejects.toMatchObject({ status: 404 });
  });
});
