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

export function optimisticAbort(selection: ScenarioSelection): void {
  selection.replace(
    selection.scenarios.map((s) => s.status === 'PENDING' ? { ...s, status: 'SKIPPED' } : s),
  );
}
