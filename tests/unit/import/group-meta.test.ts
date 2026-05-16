import { describe, it, expect } from 'vitest';
import { extractGroupName, prependGroupMeta } from '$lib/features/feature-import/lib/group-meta';

describe('extractGroupName', () => {
  it('captures the name from a meta line before Feature:', () => {
    const content = '# trace-group: Auth\nFeature: Login\n';
    expect(extractGroupName(content)).toBe('Auth');
  });

  it('trims surrounding whitespace and tabs', () => {
    const content = '#\ttrace-group:   Auth Flow  \nFeature: Login\n';
    expect(extractGroupName(content)).toBe('Auth Flow');
  });

  it('returns null when the meta line is missing', () => {
    expect(extractGroupName('Feature: Login\n')).toBeNull();
  });

  it('ignores meta lines that appear after Feature:', () => {
    const content = 'Feature: Login\n# trace-group: TooLate\n';
    expect(extractGroupName(content)).toBeNull();
  });

  it('returns null on an empty group name', () => {
    expect(extractGroupName('# trace-group:   \nFeature: Login\n')).toBeNull();
  });
});

describe('prependGroupMeta', () => {
  it('prepends a meta line above the existing content', () => {
    const out = prependGroupMeta('Feature: Login\n', 'Auth');
    expect(out).toBe('# trace-group: Auth\nFeature: Login\n');
  });

  it('round-trips through extractGroupName', () => {
    const out = prependGroupMeta('Feature: Login\n', 'Auth Flow');
    expect(extractGroupName(out)).toBe('Auth Flow');
  });
});
