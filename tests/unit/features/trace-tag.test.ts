import { describe, it, expect } from 'vitest';
import { prependTraceTag, stripTraceTag } from '$lib/features/feature-import/lib/trace-tag';

describe('prependTraceTag', () => {
  it('prepends @trace=<code> as the first line when missing', () => {
    expect(prependTraceTag('Feature: Login\n', 'tp1-3')).toBe('@trace=tp1-3\nFeature: Login\n');
  });

  it('is a no-op when @trace= is already in the head', () => {
    expect(prependTraceTag('@trace=tp1-3\nFeature: Login\n', 'tp1-3'))
      .toBe('@trace=tp1-3\nFeature: Login\n');
  });

  it('is a no-op when a different @trace= code is already there (idempotent on head presence, not on value)', () => {
    expect(prependTraceTag('@trace=tp1-9\nFeature: Login\n', 'tp1-3'))
      .toBe('@trace=tp1-9\nFeature: Login\n');
  });

  it('only checks the first 5 lines (ignores @trace= deeper in the body)', () => {
    const content = 'Feature: Login\n\n  Scenario: A\n  Scenario: B\n  Scenario: @trace=tp1-9\n';
    expect(prependTraceTag(content, 'tp1-3')).toBe(`@trace=tp1-3\n${content}`);
  });
});

describe('stripTraceTag', () => {
  it('removes a leading @trace= line', () => {
    expect(stripTraceTag('@trace=tp1-3\nFeature: Login\n')).toBe('Feature: Login\n');
  });

  it('is a no-op when no tag is leading', () => {
    expect(stripTraceTag('Feature: Login\n')).toBe('Feature: Login\n');
  });

  it('strips an @trace= line that follows a leading # trace-group: comment', () => {
    expect(stripTraceTag('# trace-group: lifecycle\n@trace=tp1-3\nFeature: Login\n'))
      .toBe('# trace-group: lifecycle\nFeature: Login\n');
  });

  it('only strips @trace= within the first 5 lines (mirrors prependTraceTag head check)', () => {
    const content = 'Feature: Login\n\n  Scenario: A\n  Scenario: B\n  Scenario: C\n@trace=tp1-9\n';
    expect(stripTraceTag(content)).toBe(content);
  });
});
