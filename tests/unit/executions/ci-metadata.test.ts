import { describe, it, expect } from 'vitest';
import { formatBranchCommit, readCiMetadata, shortCommit } from '$lib/executions/ci-metadata';

describe('readCiMetadata', () => {
  function fromMap(map: Record<string, string>) {
    return readCiMetadata((name) => map[name] ?? null);
  }

  it('returns null when no CI headers are present', () => {
    expect(fromMap({})).toBeNull();
  });

  it('returns null when only whitespace headers are present', () => {
    expect(fromMap({ 'x-ci-branch': '   ', 'x-ci-commit': '' })).toBeNull();
  });

  it('reads and trims branch and commit headers', () => {
    expect(fromMap({ 'x-ci-branch': '  main  ', 'x-ci-commit': 'a3fa827' })).toEqual({
      branch: 'main',
      commit: 'a3fa827',
    });
  });

  it('returns partial metadata when only one header is set', () => {
    expect(fromMap({ 'x-ci-branch': 'feat/foo' })).toEqual({ branch: 'feat/foo' });
  });

  it('ignores unmapped X-CI-* headers', () => {
    const out = fromMap({ 'x-ci-branch': 'main', 'x-ci-unknown': 'value' });
    expect(out).toEqual({ branch: 'main' });
  });
});

describe('shortCommit', () => {
  it('truncates SHA to 7 chars', () => {
    expect(shortCommit('a3fa827abcdef')).toBe('a3fa827');
  });

  it('leaves short commits untouched', () => {
    expect(shortCommit('abc')).toBe('abc');
  });

  it('returns undefined for nullish input', () => {
    expect(shortCommit(undefined)).toBeUndefined();
  });
});

describe('formatBranchCommit', () => {
  it('returns null for null metadata', () => {
    expect(formatBranchCommit(null)).toBeNull();
  });

  it('returns "branch@shortCommit" when both are present', () => {
    expect(formatBranchCommit({ branch: 'main', commit: 'a3fa827abcdef' })).toBe('main@a3fa827');
  });

  it('returns branch only when commit is missing', () => {
    expect(formatBranchCommit({ branch: 'main' })).toBe('main');
  });

  it('returns short commit only when branch is missing', () => {
    expect(formatBranchCommit({ commit: 'a3fa827abcdef' })).toBe('a3fa827');
  });

  it('returns null when both fields are empty strings', () => {
    expect(formatBranchCommit({ branch: '', commit: '' })).toBeNull();
  });
});
