import { describe, it, expect } from 'vitest';
import { searchFeatures } from '$lib/server/search/queries';
import { mkFeature, mkProject } from '$testing/fixtures';

describe('searchFeatures access filter', () => {
  it('returns hits only from accessible projects', async () => {
    const seen   = await mkProject();
    const hidden = await mkProject();
    await mkFeature(seen.id,   { name: 'ZZ Searchable Alpha' });
    await mkFeature(hidden.id, { name: 'ZZ Searchable Alpha' });
    const rows = await searchFeatures('ZZ Searchable Alpha', new Set([seen.id]));
    const ids = new Set(rows.map((r) => r.projectId));
    expect(ids.has(seen.id)).toBe(true);
    expect(ids.has(hidden.id)).toBe(false);
  });

  it('returns [] when the accessible set is empty', async () => {
    expect(await searchFeatures('anything', new Set())).toEqual([]);
  });
});
