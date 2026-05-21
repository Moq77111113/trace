type StorageKind = 'local' | 'session';

function getStore(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  return kind === 'session' ? window.sessionStorage : window.localStorage;
}

export type PersistedToggle = { value: boolean };

export function persistedToggle(
  key:     string,
  initial: boolean,
  kind:    StorageKind = 'local',
): PersistedToggle {
  const store  = getStore(kind);
  const stored = store?.getItem(key) ?? null;
  const state  = $state({ value: stored === null ? initial : stored === '1' });

  $effect(() => {
    store?.setItem(key, state.value ? '1' : '0');
  });

  return state;
}
