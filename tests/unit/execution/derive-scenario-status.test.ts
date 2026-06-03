import { describe, expect, it } from 'vitest';
import { deriveScenarioStatus, type StepVerdict } from '$lib/entities/execution/lib/derive-scenario-status';

describe('deriveScenarioStatus', () => {
  const cases: Array<[StepVerdict[], string]> = [
    [[], 'PENDING'],
    [['PENDING', 'PASSED'], 'PENDING'],
    [['PASSED', 'FAILED', 'PENDING'], 'FAILED'],
    [['PASSED', 'SKIPPED'], 'PASSED'],
    [['SKIPPED', 'SKIPPED'], 'SKIPPED'],
    [['PASSED', 'PASSED'], 'PASSED'],
    [['FAILED', 'SKIPPED'], 'FAILED'],
  ];

  it.each(cases)('verdicts %j -> %s', (verdicts, expected) => {
    expect(deriveScenarioStatus(verdicts)).toBe(expected);
  });
});
