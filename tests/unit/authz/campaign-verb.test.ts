import { describe, it, expect } from 'vitest';
import { ACTIONS, isAction } from '$lib/server/authz/actions';
import { verbsForRole, PROJECT_VERBS } from '$lib/server/authz/roles';

describe('campaign.manage verb', () => {
  it('is a known action', () => {
    expect(isAction('campaign.manage')).toBe(true);
    expect(ACTIONS).toContain('campaign.manage');
  });

  it('is granted to editor and manager, not viewer', () => {
    expect(verbsForRole('editor')).toContain('campaign.manage');
    expect(verbsForRole('manager')).toContain('campaign.manage');
    expect(verbsForRole('viewer')).not.toContain('campaign.manage');
  });

  it('is a project-scoped verb (surfaced on the Access page)', () => {
    expect(PROJECT_VERBS).toContain('campaign.manage');
  });
});
