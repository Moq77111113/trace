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
    expect(rows.some((r) => r.subjectKind === 'user' && r.subjectId === me.id && r.action === 'feature.view')).toBe(true);
    expect(rows.some((r) => r.subjectKind === 'any-user' && r.action === 'project.access')).toBe(true);
    expect(rows.some((r) => r.subjectId === other.id)).toBe(false);
  });

  it('returns [] for an anonymous request', async () => {
    expect(await fetchPoliciesForUser(null)).toEqual([]);
  });
});
