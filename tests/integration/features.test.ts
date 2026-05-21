import { describe, it, expect } from 'vitest';
import { mkProject } from '../fixtures';
import { createFeature } from '$lib/server/features/create';
import { listFeatures, getFeature } from '$lib/server/features/queries';

describe('features CRUD plain', () => {
  it('creates a feature with empty content', async () => {
    const p = await mkProject({ name: `Fp ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'Login' });
    expect(f.content).toBe('');
    const fetched = await getFeature(f.id);
    expect(fetched?.id).toBe(f.id);
  });

  it('listFeatures returns the new feature', async () => {
    const p = await mkProject({ name: `Lp ${Date.now()}` });
    await createFeature({ projectId: p.id, name: 'A' });
    const list = await listFeatures(p.id);
    expect(list.length).toBe(1);
  });
});
