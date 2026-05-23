import { describe, it, expect } from 'vitest';
import { createProject, projectInput } from '$lib/server/projects/create';
import { listProjectsWithStats } from '$lib/server/projects/queries';
import { mkUser } from '$testing/fixtures';

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
    const list = await listProjectsWithStats(new Set([created.value.id]));
    expect(list.some((p) => p.name === name)).toBe(true);
  });

  it('listProjectsWithStats returns only the projects in the accessible set', async () => {
    const creator = await mkUser();
    const a = await createProject({ name: `Acc ${Date.now()}-1` }, creator.id);
    const b = await createProject({ name: `Acc ${Date.now()}-2` }, creator.id);
    if (!a.ok || !b.ok) throw new Error('createProject failed');
    const rows = await listProjectsWithStats(new Set([a.value.id]));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(a.value.id);
    expect(ids).not.toContain(b.value.id);
  });
});
