// @vitest-environment node
import { it, expect } from 'vitest';
import { manualCommit } from '../../../src/routes/(app)/p/[slug]/import/actions/manual-commit';
import { mkProject } from '$testing/fixtures';
import { makeAuthorizer } from '$lib/server/authz/authorizer';
import { grantAnyUserBlanket } from '$lib/server/authz/seed';

type CommitEvent = Parameters<typeof manualCommit>[0];

const FAKE_USER = { id: '00000000-0000-7000-8000-000000000098', email: 'u@x', name: null, role: 'user' as const, welcomedAt: null };

function buildEvent(project: { slug: string }, form: Record<string, string>): CommitEvent {
  const body = new FormData();
  for (const [k, v] of Object.entries(form)) body.set(k, v);
  const request = new Request(`http://localhost/p/${project.slug}/import`, { method: 'POST', body });
  return {
    params:  { slug: project.slug },
    request,
    locals:  { user: FAKE_USER, authz: makeAuthorizer(FAKE_USER) },
  } as unknown as CommitEvent;
}

it('returns 400 when decisions is malformed JSON', async () => {
  const p = await mkProject({ name: `ManualCommit ${Date.now()}-${Math.random()}` });
  await grantAnyUserBlanket(p.id);

  const event = buildEvent(p, { previewId: 'preview-1', groupingField: 'component', decisions: 'not json{' });
  const result = await manualCommit(event);

  expect(result).toMatchObject({ status: 400 });
});
