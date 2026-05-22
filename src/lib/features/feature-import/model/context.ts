import { getContext, setContext } from 'svelte';
import type { ImportState } from './import-state.svelte';

const KEY = Symbol('feature-import');

export function provideImport(flow: ImportState): ImportState {
  return setContext(KEY, flow);
}

export function useImport(): ImportState {
  const flow = getContext<ImportState | undefined>(KEY);
  if (!flow) throw new Error('useImport: missing provider');
  return flow;
}
