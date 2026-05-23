import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import { fetchPoliciesForUser } from '$lib/server/authz/policy-store';
import { mkUser } from '$testing/fixtures';

describe('fetchPoliciesForUser', () => {
  it('returns the user-specific and any-user rows, not other users', async () => {
    const me    = await mkUser();
    const other = await mkUser();

    await db.insert(policies).values([
      { subjectKind: 'user', subjectId: me.id,    action: 'feature.view', scopeKind: 'instance', scopeId: null, effect: 'allow' },
      { subjectKind: 'any-user', subjectId: null, action: 'project.access', scopeKind: 'instance', scopeId: null, effect: 'allow' },
      { subjectKind: 'user', subjectId: other.id, action: 'feature.author', scopeKind: 'instance', scopeId: null, effect: 'allow' },
    ]);

    const rows = await fetchPoliciesForUser(me.id);
    const actions = rows.map((r) => r.action).sort();
    expect(actions).toContain('feature.view');
    expect(actions).toContain('project.access');
    expect(actions).not.toContain('feature.author');
  });

  it('returns [] for an anonymous request', async () => {
    expect(await fetchPoliciesForUser(null)).toEqual([]);
  });
});
