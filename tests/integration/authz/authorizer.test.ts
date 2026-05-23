import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { mkUser } from '$testing/fixtures';

const asUser = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });
const PROJECT = '00000000-0000-7000-8000-000000000001';
const chain = [{ kind: 'feature', id: 'f1' }, { kind: 'project', id: PROJECT }, { kind: 'instance' }] as const;

describe('makeAuthorizer', () => {
  it('exposes the acting user', () => {
    expect(makeAuthorizer(asUser('x')).user?.id).toBe('x');
  });

  it('can(): allow cascades from an ancestor scope; unmatched action is default-deny', async () => {
    const u = await mkUser();
    await db.insert(policies).values({ subjectKind: 'user', subjectId: u.id, action: 'feature.view', scopeKind: 'project', scopeId: PROJECT, effect: 'allow' });
    const authz = makeAuthorizer(asUser(u.id));
    expect(await authz.can('feature.view', [...chain])).toBe(true);
    expect(await authz.can('feature.author', [...chain])).toBe(false);
  });

  it('can(): deny overrides allow', async () => {
    const u = await mkUser();
    await db.insert(policies).values([
      { subjectKind: 'user', subjectId: u.id, action: 'feature.view', scopeKind: 'project', scopeId: PROJECT, effect: 'allow' },
      { subjectKind: 'user', subjectId: u.id, action: 'feature.view', scopeKind: 'project', scopeId: PROJECT, effect: 'deny' },
    ]);
    expect(await makeAuthorizer(asUser(u.id)).can('feature.view', [...chain])).toBe(false);
  });

  it('authorize() throws 403 when denied, resolves when allowed', async () => {
    const u = await mkUser();
    await expect(makeAuthorizer(asUser(u.id)).authorize('feature.view', [...chain])).rejects.toMatchObject({ status: 403 });
    await db.insert(policies).values({ subjectKind: 'user', subjectId: u.id, action: 'feature.view', scopeKind: 'project', scopeId: PROJECT, effect: 'allow' });
    await expect(makeAuthorizer(asUser(u.id)).authorize('feature.view', [...chain])).resolves.toBeUndefined();
  });

  it('anonymous is denied everything', async () => {
    expect(await makeAuthorizer(null).can('feature.view', [...chain])).toBe(false);
  });
});
