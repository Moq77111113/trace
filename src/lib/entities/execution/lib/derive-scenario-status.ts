export type StepVerdict = 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';

/** Rolls a scenario's step verdicts into one status: FAILED > PENDING > all-SKIPPED > PASSED. */
export function deriveScenarioStatus(verdicts: StepVerdict[]): StepVerdict {
  if (verdicts.length === 0)            return 'PENDING';
  if (verdicts.includes('FAILED'))      return 'FAILED';
  if (verdicts.includes('PENDING'))     return 'PENDING';
  if (verdicts.every((v) => v === 'SKIPPED')) return 'SKIPPED';
  return 'PASSED';
}
