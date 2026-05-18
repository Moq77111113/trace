import { describe, it, expect } from 'vitest';
import { createProject, projectInput } from '$lib/server/projects/create';
import { listProjectsWithStats } from '$lib/server/projects/queries';

describe('projects domain', () => {
  it('rejects empty name', () => {
    expect(() => projectInput.parse({ name: '' })).toThrow();
  });

  it('inserts and returns the row', async () => {
    const result = await createProject({ name: `Demo ${Date.now()}` });
    if (!result.ok) throw new Error(`createProject failed: ${result.error}`);
    expect(result.value.id).toBeDefined();
    expect(result.value.archived).toBe(false);
    expect(result.value.slug).toMatch(/^demo/);
    expect(result.value.codePrefix).toMatch(/^demo/);
  });

  it('returns slug-taken error when the slug is already used', async () => {
    const first = await createProject({ name: 'Twin', slug: `twin-${Date.now().toString(36)}` });
    if (!first.ok) throw new Error('first insert failed');

    const dupe = await createProject({ name: 'Twin Dupe', slug: first.value.slug });
    expect(dupe).toEqual({ ok: false, error: 'slug-taken' });
  });

  it('listProjectsWithStats includes new project', async () => {
    const name = `Listed ${Date.now()}`;
    await createProject({ name });
    const list = await listProjectsWithStats();
    expect(list.some((p) => p.name === name)).toBe(true);
  });
});
