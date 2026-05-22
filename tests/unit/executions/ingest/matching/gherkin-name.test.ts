import { describe, it, expect } from 'vitest';
import { matchByGherkinName, extractGherkinFeatureName } from '$lib/server/executions/ingest/matching/strategies/gherkin-name';
import { mkFeature, mkProject } from '$testing/fixtures';

describe('extractGherkinFeatureName', () => {
  it('returns the Feature: line text trimmed', () => {
    expect(extractGherkinFeatureName('Feature: Login\n  Scenario: A\n')).toBe('Login');
  });

  it('tolerates leading whitespace before Feature:', () => {
    expect(extractGherkinFeatureName('  Feature:   Login  \n')).toBe('Login');
  });

  it('tolerates tags / comments above Feature:', () => {
    expect(extractGherkinFeatureName('@smoke\n# trace-group: x\n@trace=foo-1\nFeature: Login\n')).toBe('Login');
  });

  it('returns null when no Feature: line is present', () => {
    expect(extractGherkinFeatureName('Scenario: orphan\n')).toBeNull();
  });

  it('returns null on empty content', () => {
    expect(extractGherkinFeatureName('')).toBeNull();
  });
});

describe('matchByGherkinName', () => {
  it('matches case-insensitively against the Gherkin Feature: line, ignoring admin features.name', async () => {
    const project = await mkProject({ name: `Gherkin name ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, {
      name:    'ticket lifecycle create',
      content: 'Feature: Creating a ticket\n\n  Scenario: A\n',
    });

    const result = await matchByGherkinName('Creating a ticket', project.id);
    expect(result?.id).toBe(feature.id);
  });

  it('is case-insensitive on the cucumber input', async () => {
    const project = await mkProject({ name: `Gherkin ci ${Date.now()}-${Math.random()}` });
    const feature = await mkFeature(project.id, {
      name:    'whatever',
      content: 'Feature: Login\n  Scenario: A\n',
    });

    const result = await matchByGherkinName('LOGIN', project.id);
    expect(result?.id).toBe(feature.id);
  });

  it('returns null when no feature has a matching Gherkin Feature: line', async () => {
    const project = await mkProject({ name: `Gherkin none ${Date.now()}-${Math.random()}` });
    await mkFeature(project.id, { name: 'Whatever', content: 'Feature: Something\n' });

    const result = await matchByGherkinName('Nonexistent', project.id);
    expect(result).toBeNull();
  });

  it('excludes archived features', async () => {
    const project = await mkProject({ name: `Gherkin archived ${Date.now()}-${Math.random()}` });
    await mkFeature(project.id, {
      name:     'admin',
      content:  'Feature: Login\n',
      archived: true,
    });

    const result = await matchByGherkinName('Login', project.id);
    expect(result).toBeNull();
  });
});
