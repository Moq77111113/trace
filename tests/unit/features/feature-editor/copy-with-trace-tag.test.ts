import { describe, it, expect } from 'vitest';
import { decorateCopy } from '$lib/features/feature-editor/model/copy-with-trace-tag';

describe('decorateCopy', () => {
  it('prepends @trace=<code> when the selection covers the document start', () => {
    const text = 'Feature: Login\n  Scenario: A\n';
    expect(decorateCopy(text, { startLineNumber: 1, startColumn: 1 }, 'tp1-3'))
      .toBe('@trace=tp1-3\nFeature: Login\n  Scenario: A\n');
  });

  it('returns the selection verbatim when the selection does NOT start at (1, 1)', () => {
    expect(decorateCopy('  Scenario: A\n', { startLineNumber: 2, startColumn: 1 }, 'tp1-3'))
      .toBe('  Scenario: A\n');

    expect(decorateCopy('eature: Login\n', { startLineNumber: 1, startColumn: 2 }, 'tp1-3'))
      .toBe('eature: Login\n');
  });

  it('is a no-op when the selected text already starts with @trace=', () => {
    const text = '@trace=tp1-3\nFeature: Login\n';
    expect(decorateCopy(text, { startLineNumber: 1, startColumn: 1 }, 'tp1-3')).toBe(text);
  });
});
