import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import { mkProject } from '../../fixtures';
import { createFeature } from '$lib/server/features/create';
import { createGroup } from '$lib/server/groups/create';
import { saveFeature } from '$lib/server/features/save';
import { exportFeature } from '$lib/server/features/export';

describe('exportFeature', () => {
  it('returns content with safe slugged filename', async () => {
    const p = await mkProject({ name: `Exp ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'User Login Flow' });
    await saveFeature({
      featureId:       f.id,
      content:         'Feature: User Login Flow\n',
      expectedVersion: f.version,
      editor:          'test',
    });

    const out = await exportFeature(f.id);

    expect(out).not.toBeNull();
    expect(out?.filename).toBe('user-login-flow.feature');
    expect(out?.mimeType).toBe('text/plain');
    expect(out?.content).toContain('Feature: User Login Flow');
  });

  it('falls back to "feature" when name slug is empty', async () => {
    const p = await mkProject({ name: `Empty ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: '!!!' });

    const out = await exportFeature(f.id);

    expect(out?.filename).toBe('feature.feature');
  });

  it('returns null for archived features', async () => {
    const p = await mkProject({ name: `Arc ${Date.now()}` });
    const f = await createFeature({ projectId: p.id, name: 'Archived' });
    await db.update(features).set({ archived: true }).where(eq(features.id, f.id));

    expect(await exportFeature(f.id)).toBeNull();
  });

  it('returns null when feature does not exist', async () => {
    expect(await exportFeature('00000000-0000-7000-8000-000000000000')).toBeNull();
  });

  it('prepends a # trace-group meta line when the feature is in a group', async () => {
    const p = await mkProject({ name: `Grp ${Date.now()}` });
    const g = await createGroup({ projectId: p.id, name: 'Auth' });
    if (!g.ok) throw new Error('createGroup failed');
    const f = await createFeature({ projectId: p.id, name: 'Login', groupId: g.value.id });
    await saveFeature({
      featureId:       f.id,
      content:         'Feature: Login\n',
      expectedVersion: f.version,
      editor:          'test',
    });

    const out = await exportFeature(f.id);

    expect(out?.content.startsWith('# trace-group: Auth\n')).toBe(true);
    expect(out?.content).toContain('Feature: Login');
  });
});
