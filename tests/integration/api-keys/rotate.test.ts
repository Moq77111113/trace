import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { apikey } from '$lib/server/db/schema';
import { listApiKeys, rotateApiKey } from '$lib/server/api-keys';
import { createTestApiKey } from '../_helpers/api-key';
import { mkProject } from '../../fixtures';

async function seedProject() {
  return mkProject({ name: `Rotate ${Date.now()}-${Math.random()}` });
}

async function findApiKeyId(projectId: string, name: string): Promise<string> {
  const keys = await listApiKeys(projectId);
  const match = keys.find((k) => k.name === name);
  if (!match) throw new Error(`api key "${name}" not found`);
  return match.id;
}

describe('rotateApiKey', () => {
  it('creates a new key sharing the old name and revokes the original', async () => {
    const project       = await seedProject();
    const { userId }    = await createTestApiKey(project.id, 'ci-prod');
    const oldId         = await findApiKeyId(project.id, 'ci-prod');

    const created = await rotateApiKey({ id: oldId, projectId: project.id, userId });

    expect(created.id).not.toBe(oldId);
    expect(created.key).toMatch(/^crun_/);

    const after = await listApiKeys(project.id);
    const oldKey = after.find((k) => k.id === oldId);
    const newKey = after.find((k) => k.id === created.id);
    expect(oldKey?.enabled).toBe(false);
    expect(newKey?.enabled).toBe(true);
    expect(newKey?.name).toBe('ci-prod');
  });

  it('rejects rotation when the key belongs to a different project', async () => {
    const projectA       = await seedProject();
    const projectB       = await seedProject();
    const { userId }     = await createTestApiKey(projectA.id, 'ci-a');
    const aId            = await findApiKeyId(projectA.id, 'ci-a');

    await expect(rotateApiKey({ id: aId, projectId: projectB.id, userId })).rejects.toThrow(
      /not scoped to this project/,
    );

    const [stillEnabled] = await db
      .select({ enabled: apikey.enabled })
      .from(apikey)
      .where(eq(apikey.id, aId));
    expect(stillEnabled?.enabled ?? null).not.toBe(false);

    const projectBKeys = await listApiKeys(projectB.id);
    expect(projectBKeys).toEqual([]);
  });
});
