import { describe, it, expect } from 'vitest';
import { PROJECT_ROLES, verbsForRole, roleForVerbs } from '$lib/server/authz/roles';
import type { Action } from '$lib/server/authz/actions';

describe('authz/roles', () => {
  it('verbsForRole nests viewer ⊂ editor ⊂ manager', () => {
    expect(new Set(verbsForRole('viewer'))).toEqual(
      new Set<Action>(['project.access', 'feature.view', 'execution.review']),
    );
    expect(new Set(verbsForRole('editor'))).toEqual(
      new Set<Action>(['project.access', 'feature.view', 'execution.review', 'feature.author', 'execution.run']),
    );
    expect(new Set(verbsForRole('manager'))).toEqual(
      new Set<Action>(['project.access', 'feature.view', 'execution.review', 'feature.author', 'execution.run', 'project.manage']),
    );
  });

  it('roleForVerbs round-trips every role', () => {
    for (const role of PROJECT_ROLES) {
      expect(roleForVerbs(new Set(verbsForRole(role)))).toBe(role);
    }
  });

  it('roleForVerbs returns null for a non-matching set (subset, superset, wildcard)', () => {
    expect(roleForVerbs(new Set(['project.access']))).toBeNull();
    expect(roleForVerbs(new Set(['project.access', 'feature.view', 'execution.review', 'project.manage']))).toBeNull();
    expect(roleForVerbs(new Set(['*']))).toBeNull();
    expect(roleForVerbs(new Set())).toBeNull();
  });
});
