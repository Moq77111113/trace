import { type StepVerdict } from '$lib/entities/execution/lib/derive-scenario-status';
import type { ScenarioSelection } from './selection.svelte';
import type { Verdict }           from './context';

export function optimisticMark(selection: ScenarioSelection, id: string, status: Verdict): () => void {
  const previous = selection.scenarios.find((s) => s.id === id)?.status;
  if (!previous) return () => {};

  selection.replace(selection.scenarios.map((s) => s.id === id ? { ...s, status } : s));
  if (status !== 'FAILED') selection.select(selection.pickNextPending(id));

  return () => selection.replace(
    selection.scenarios.map((s) => s.id === id ? { ...s, status: previous } : s),
  );
}

/** Applies a step verdict locally and returns a rollback restoring the prior verdict. */
export function optimisticMarkStep(selection: ScenarioSelection, stepId: string, verdict: StepVerdict): () => void {
  const owner    = selection.scenarios.find((s) => s.steps.some((st) => st.id === stepId));
  const previous = owner?.steps.find((st) => st.id === stepId)?.verdict;
  selection.markStepLocal(stepId, verdict);
  return previous ? () => selection.markStepLocal(stepId, previous) : () => {};
}

export function optimisticAbort(selection: ScenarioSelection): void {
  selection.replace(
    selection.scenarios.map((s) => s.status === 'PENDING' ? { ...s, status: 'SKIPPED' } : s),
  );
}
