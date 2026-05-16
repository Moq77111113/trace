import { describe, it, expect } from 'vitest';
import { extractScenarioSteps } from '$lib/gherkin/steps';

describe('extractScenarioSteps', () => {
  it('returns the steps of the named scenario', () => {
    const src = `Feature: Login

  Scenario: Sign in with email
    Given I am on the login page
    When I submit valid credentials
    Then I see the dashboard
`;
    const steps = extractScenarioSteps(src, 'Sign in with email');
    expect(steps.map((s) => s.keyword)).toEqual(['Given', 'When', 'Then']);
    expect(steps.map((s) => s.text)).toEqual([
      'I am on the login page',
      'I submit valid credentials',
      'I see the dashboard',
    ]);
  });

  it('prepends background steps', () => {
    const src = `Feature: Login

  Background:
    Given a registered user "alice"

  Scenario: Sign in with email
    When she submits valid credentials
    Then she sees the dashboard
`;
    const steps = extractScenarioSteps(src, 'Sign in with email');
    expect(steps.map((s) => s.text)).toEqual([
      'a registered user "alice"',
      'she submits valid credentials',
      'she sees the dashboard',
    ]);
  });

  it('returns an empty array when the scenario is not found', () => {
    const src = `Feature: Login

  Scenario: A
    Given x
`;
    expect(extractScenarioSteps(src, 'B')).toEqual([]);
  });

  it('returns an empty array on parse error', () => {
    expect(extractScenarioSteps('Feature Login\nScenrio: A\n', 'A')).toEqual([]);
  });

  it('returns an empty array on empty content', () => {
    expect(extractScenarioSteps('', 'A')).toEqual([]);
  });
});
