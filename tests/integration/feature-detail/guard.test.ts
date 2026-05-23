import { describe, it, expect } from 'vitest';
import { load } from '../../../src/routes/(app)/p/[slug]/[code=featureCode]/+page.server';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { grantProjectAccess, mkFeature, mkProject, mkUser } from '$testing/fixtures';

const userObj = (id: string) => ({ id, email: 'u@x', name: null, role: 'user' as const, welcomedAt: null });
function evt(slug: string, code: string, project: unknown, userId: string) {
  const u = userObj(userId);
  return { params: { slug, code }, parent: async () => ({ breadcrumbs: [], project }), locals: { user: u, authz: makeAuthorizer(u) } } as unknown as Parameters<typeof load>[0];
}

describe('feature detail guard', () => {
  it('load 403s without feature.view, succeeds with it', async () => {
    const u = await mkUser(); const p = await mkProject(); const f = await mkFeature(p.id);
    const code = `${p.codePrefix}-${f.codeSeq}`;
    await expect(load(evt(p.slug, code, p, u.id))).rejects.toMatchObject({ status: 403 });
    await grantProjectAccess(u.id, p.id, 'feature.view');
    expect((await load(evt(p.slug, code, p, u.id))).feature.id).toBe(f.id);
  });
});
