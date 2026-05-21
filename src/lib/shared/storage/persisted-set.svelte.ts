import { SvelteSet } from 'svelte/reactivity';

type StorageKind = 'local' | 'session';

function getStore(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  return kind === 'session' ? window.sessionStorage : window.localStorage;
}

/**
 * Reactive `Set<string>` whose contents are mirrored to `localStorage` (or
 * `sessionStorage`) under `key`. Hydrates from storage on construction and
 * writes back the array form on every mutation via `$effect`.
 *
 * Sibling of `persistedToggle`; same call-site rules — must be created during
 * component init (or another effect root) because of the internal `$effect`.
 */
export function persistedSet(
  key:  string,
  kind: StorageKind = 'local',
): SvelteSet<string> {
  const store = getStore(kind);
  const ids   = new SvelteSet<string>();

  const raw = store?.getItem(key);
  if (raw) {
    try {
      for (const id of JSON.parse(raw) as string[]) ids.add(id);
    } catch {
      /* empty / corrupted entry, ignore */
    }
  }

  $effect(() => {
    store?.setItem(key, JSON.stringify([...ids]));
  });

  return ids;
}
