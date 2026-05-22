import { describe, it, expect } from 'vitest';
import { matchByCodeTag, extractTraceCode } from '$lib/server/executions/ingest/matching/strategies/code-tag';
import { mkFeature, mkProject } from '$testing/fixtures';

describe('extractTraceCode', () => {
  it('extracts a lowercased feature code from a @trace= tag', () => {
    expect(extractTraceCode(['@trace=auth-3'])).toBe('auth-3');
  });

  it('accepts case-insensitive @TRACE= literal and normalizes the code to lowercase', () => {
    expect(extractTraceCode(['@TRACE=AUTH-3'])).toBe('auth-3');
  });

  it('takes the first @trace= tag when multiple are present', () => {
    expect(extractTraceCode(['@trace=auth-3', '@trace=auth-9'])).toBe('auth-3');
  });

  it('returns null when no @trace= tag exists', () => {
    expect(extractTraceCode(['@smoke', '@regression'])).toBeNull();
  });

  it('returns null when tags array is empty', () => {
    expect(extractTraceCode([])).toBeNull();
  });
});

describe('matchByCodeTag', () => {
  it('returns the feature when the tagged code resolves', async () => {
    const project = await mkProject({ name: `Tag match ${Date.now()}-${Math.random()}`, codePrefix: 'ct' });
    const feature = await mkFeature(project.id, { name: 'Login' });
    const tag = `@trace=ct-${feature.codeSeq}`;

    const result = await matchByCodeTag([tag], project.id);

    expect(result.kind).toBe('matched');
    if (result.kind === 'matched') {
      expect(result.feature.id).toBe(feature.id);
    }
  });

  it('returns no-tag when the feature carries no @trace= tag', async () => {
    const project = await mkProject({ name: `No tag ${Date.now()}-${Math.random()}` });

    const result = await matchByCodeTag(['@smoke'], project.id);

    expect(result.kind).toBe('no-tag');
  });

  it('returns missing-code when the tag is well-formed but the code does not exist', async () => {
    const project = await mkProject({ name: `Bad tag ${Date.now()}-${Math.random()}`, codePrefix: 'bt' });

    const result = await matchByCodeTag(['@trace=bt-999'], project.id);

    expect(result.kind).toBe('missing-code');
    if (result.kind === 'missing-code') {
      expect(result.code).toBe('bt-999');
    }
  });

  it('returns missing-code when the tag is malformed (parseFeatureCode returns null)', async () => {
    const project = await mkProject({ name: `Malformed ${Date.now()}-${Math.random()}` });

    const result = await matchByCodeTag(['@trace=NotACode'], project.id);

    expect(result.kind).toBe('missing-code');
  });
});
