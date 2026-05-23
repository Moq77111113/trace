import { describe, it, expect } from 'vitest';
import { ACTIONS, isAction } from '$lib/server/authz/actions';

describe('authz actions', () => {
  it('exposes the closed verb set', () => {
    expect([...ACTIONS]).toEqual([
      'project.access', 'project.manage',
      'feature.view', 'feature.author',
      'execution.run', 'execution.review',
      'instance.administer',
    ]);
  });

  it('isAction accepts a known verb', () => {
    expect(isAction('feature.author')).toBe(true);
  });

  it('isAction rejects unknown verbs and the wildcard', () => {
    expect(isAction('feature.delete')).toBe(false);
    expect(isAction('*')).toBe(false);
  });
});
