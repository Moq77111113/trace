import { getContext, setContext } from 'svelte';
import type { ScenarioSelection } from './selection.svelte';

const KEY = Symbol('live-execution-selection');

export type Verdict = 'PASSED' | 'FAILED' | 'SKIPPED';

export function provideSelection(selection: ScenarioSelection): ScenarioSelection {
  return setContext(KEY, selection);
}

export function useSelection(): ScenarioSelection {
  const selection = getContext<ScenarioSelection | undefined>(KEY);
  if (!selection) throw new Error('useSelection: missing provider');
  return selection;
}
