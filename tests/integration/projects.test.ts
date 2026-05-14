import { describe, it, expect } from 'vitest';
import { createProject, projectInput } from '$lib/server/projects/create';
import { listProjectsWithStats } from '$lib/server/projects/queries';

describe('projects domain', () => {
  it('rejects empty name', () => {
    expect(() => projectInput.parse({ name: '' })).toThrow();
  });

  it('inserts and returns the row', async () => {
    const p = await createProject({ name: `Demo ${Date.now()}` });
    expect(p.id).toBeDefined();
    expect(p.archived).toBe(false);
  });

  it('listProjectsWithStats includes new project', async () => {
    const name = `Listed ${Date.now()}`;
    await createProject({ name });
    const list = await listProjectsWithStats();
    expect(list.some((p) => p.name === name)).toBe(true);
  });
});
