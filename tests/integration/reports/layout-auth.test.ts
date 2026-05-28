import { describe, it, expect } from 'vitest';
import { load } from '~/src/routes/(reports)/+layout.server';

type LayoutEvent = Parameters<typeof load>[0];

function buildEvent(opts: { authed: boolean }): LayoutEvent {
  const url = new URL('http://localhost/p/foo/executions/abc/report.html');
  const locals = opts.authed
    ? { user: { id: 'u1', email: 'u@x', name: null, role: 'user' as const, welcomedAt: null }, session: { id: 's' } }
    : { user: null, session: null };
  return { url, locals } as unknown as LayoutEvent;
}

async function invoke(event: LayoutEvent) {
  try {
    const out = await load(event);
    return { kind: 'ok' as const, value: out };
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e && 'location' in e) {
      const r = e as { status: number; location: string };
      return { kind: 'redirect' as const, status: r.status, location: r.location };
    }
    throw e;
  }
}

describe('(reports) +layout.server', () => {
  it('redirects to /login when unauthenticated', async () => {
    const out = await invoke(buildEvent({ authed: false }));
    expect(out.kind).toBe('redirect');
    if (out.kind === 'redirect') {
      expect(out.status).toBe(303);
      expect(out.location).toContain('/login?next=');
    }
  });

  it('passes through when authenticated', async () => {
    const out = await invoke(buildEvent({ authed: true }));
    expect(out.kind).toBe('ok');
  });
});
