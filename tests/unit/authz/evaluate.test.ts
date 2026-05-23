import { describe, it, expect } from 'vitest';
import { can, type PolicyRow, type ScopeRef, type SubjectRef } from '$lib/server/authz/evaluate';

const USER = 'user-1';
const subjects: SubjectRef[] = [{ kind: 'user', id: USER }, { kind: 'any-user' }];

// scope chain for a feature: feature -> project -> instance
const featureChain: ScopeRef[] = [
  { kind: 'feature', id: 'feat-1' },
  { kind: 'project', id: 'proj-1' },
  { kind: 'instance' },
];

const row = (p: Partial<PolicyRow>): PolicyRow => ({
  subjectKind: 'user', subjectId: USER,
  action: 'feature.view', scopeKind: 'project', scopeId: 'proj-1',
  effect: 'allow', ...p,
});

describe('can()', () => {
  it('default-deny when no policy matches', () => {
    expect(can({ subjects, action: 'feature.view', scopeChain: featureChain, policies: [] })).toBe(false);
  });

  it('allows when a matching allow exists at an ancestor scope', () => {
    expect(can({ subjects, action: 'feature.view', scopeChain: featureChain, policies: [row({})] })).toBe(true);
  });

  it('deny overrides allow even across scopes', () => {
    const policies = [
      row({ effect: 'allow', scopeKind: 'project', scopeId: 'proj-1' }),
      row({ effect: 'deny',  scopeKind: 'feature', scopeId: 'feat-1' }),
    ];
    expect(can({ subjects, action: 'feature.view', scopeChain: featureChain, policies })).toBe(false);
  });

  it('cascades a project-scoped grant down to a feature action', () => {
    expect(can({ subjects, action: 'feature.view', scopeChain: featureChain, policies: [
      row({ action: 'feature.view', scopeKind: 'project', scopeId: 'proj-1' }),
    ] })).toBe(true);
  });

  it('does not match a sibling scope', () => {
    expect(can({ subjects, action: 'feature.view', scopeChain: featureChain, policies: [
      row({ scopeKind: 'project', scopeId: 'OTHER' }),
    ] })).toBe(false);
  });

  it('wildcard action matches any verb', () => {
    expect(can({ subjects, action: 'feature.author', scopeChain: featureChain, policies: [
      row({ action: '*', scopeKind: 'instance', scopeId: null }),
    ] })).toBe(true);
  });

  it('instance-admin grant (*, instance) allows anything anywhere', () => {
    expect(can({ subjects, action: 'project.manage', scopeChain: [{ kind: 'project', id: 'proj-1' }, { kind: 'instance' }], policies: [
      row({ action: '*', scopeKind: 'instance', scopeId: null }),
    ] })).toBe(true);
  });

  it('any-user subject grant applies to a logged-in user', () => {
    expect(can({ subjects, action: 'feature.view', scopeChain: featureChain, policies: [
      row({ subjectKind: 'any-user', subjectId: null, scopeKind: 'project', scopeId: 'proj-1' }),
    ] })).toBe(true);
  });

  it('a policy for a different user is ignored', () => {
    expect(can({ subjects, action: 'feature.view', scopeChain: featureChain, policies: [
      row({ subjectKind: 'user', subjectId: 'someone-else' }),
    ] })).toBe(false);
  });

  it('anonymous (no subjects) is always denied', () => {
    expect(can({ subjects: [], action: 'feature.view', scopeChain: featureChain, policies: [
      row({ subjectKind: 'any-user', subjectId: null }),
    ] })).toBe(false);
  });
});
