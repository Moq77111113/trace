import { describe, it, expect } from 'vitest';
import { createProject, projectInput } from '$lib/server/projects/create';
import { listProjectsWithStats, listRecentExecutions, listAccessibleProjects } from '$lib/server/projects/queries';
import { executions } from '$lib/server/db/schema';
import { db } from '$lib/server/db/client';
import { mkUser, mkFeature, grantProjectAccess } from '$testing/fixtures';
import { makeAuthorizer } from '$lib/server/authz/authorizer';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });

describe('projects domain', () => {
  it('rejects empty name', () => {
    expect(() => projectInput.parse({ name: '' })).toThrow();
  });

  it('inserts and returns the row', async () => {
    const creator = await mkUser();
    const result = await createProject({ name: `Demo ${Date.now()}` }, creator.id);
    if (!result.ok) throw new Error(`createProject failed: ${result.error}`);
    expect(result.value.id).toBeDefined();
    expect(result.value.archived).toBe(false);
    expect(result.value.slug).toMatch(/^demo/);
    expect(result.value.codePrefix).toMatch(/^demo/);
  });

  it('returns slug-taken error when the slug is already used', async () => {
    const creator = await mkUser();
    const first = await createProject({ name: 'Twin', slug: `twin-${Date.now().toString(36)}` }, creator.id);
    if (!first.ok) throw new Error('first insert failed');

    const dupe = await createProject({ name: 'Twin Dupe', slug: first.value.slug }, creator.id);
    expect(dupe).toEqual({ ok: false, error: 'slug-taken' });
  });

  it('listProjectsWithStats includes new project', async () => {
    const name = `Listed ${Date.now()}`;
    const creator = await mkUser();
    const created = await createProject({ name }, creator.id);
    if (!created.ok) throw new Error('createProject failed');
    await grantProjectAccess(creator.id, created.value.id, 'project.access');
    const list = await listProjectsWithStats(makeAuthorizer(asUser(creator.id)));
    expect(list.some((p) => p.name === name)).toBe(true);
  });

  it('listProjectsWithStats returns only the projects the caller can access', async () => {
    const creator = await mkUser();
    const a = await createProject({ name: `Acc ${Date.now()}-1` }, creator.id);
    const b = await createProject({ name: `Acc ${Date.now()}-2` }, creator.id);
    if (!a.ok || !b.ok) throw new Error('createProject failed');
    const viewer = await mkUser();
    await grantProjectAccess(viewer.id, a.value.id, 'project.access');
    const rows = await listProjectsWithStats(makeAuthorizer(asUser(viewer.id)));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(a.value.id);
    expect(ids).not.toContain(b.value.id);
  });

  it('listAccessibleProjects returns only the projects the caller can access (sidebar nav)', async () => {
    const creator = await mkUser();
    const a = await createProject({ name: `Nav ${Date.now()}-a` }, creator.id);
    const b = await createProject({ name: `Nav ${Date.now()}-b` }, creator.id);
    if (!a.ok || !b.ok) throw new Error('createProject failed');
    const viewer = await mkUser();
    await grantProjectAccess(viewer.id, a.value.id, 'project.access');
    const rows = await listAccessibleProjects(makeAuthorizer(asUser(viewer.id)));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(a.value.id);
    expect(ids).not.toContain(b.value.id);
  });

  it('listRecentExecutions returns runs only from accessible projects', async () => {
    const creator = await mkUser();
    const seen   = await createProject({ name: `Rec ${Date.now()}-seen` }, creator.id);
    const hidden = await createProject({ name: `Rec ${Date.now()}-hidden` }, creator.id);
    if (!seen.ok || !hidden.ok) throw new Error('createProject failed');
    const fSeen   = await mkFeature(seen.value.id);
    const fHidden = await mkFeature(hidden.value.id);
    await db.insert(executions).values([
      { featureId: fSeen.id,   source: 'MANUAL', executedBy: creator.id, featureContentAtStart: fSeen.content,   status: 'PASSED', startedAt: new Date() },
      { featureId: fHidden.id, source: 'MANUAL', executedBy: creator.id, featureContentAtStart: fHidden.content, status: 'PASSED', startedAt: new Date() },
    ]);
    const viewer = await mkUser();
    await grantProjectAccess(viewer.id, seen.value.id, 'project.access');
    const rows = await listRecentExecutions(makeAuthorizer(asUser(viewer.id)), 20);
    const projectIds = rows.map((r) => r.projectId);
    expect(projectIds).toContain(seen.value.id);
    expect(projectIds).not.toContain(hidden.value.id);
  });
});
