export type StepVerdict = 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';

/**
 * Derives a scenario's rollup status from its step verdicts:
 * any FAILED wins, then any PENDING keeps the scenario open, all-SKIPPED is
 * SKIPPED, otherwise PASSED (skips tolerated alongside passes). An empty step
 * list is PENDING — nothing has been run yet.
 */
export function deriveScenarioStatus(verdicts: StepVerdict[]): StepVerdict {
  if (verdicts.length === 0)            return 'PENDING';
  if (verdicts.includes('FAILED'))      return 'FAILED';
  if (verdicts.includes('PENDING'))     return 'PENDING';
  if (verdicts.every((v) => v === 'SKIPPED')) return 'SKIPPED';
  return 'PASSED';
}
