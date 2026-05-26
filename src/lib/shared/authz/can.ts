import { page } from '$app/state';
import type { Action } from '$lib/server/authz/actions';

/**
 * True if the current scope (the nearest layout that published `capabilities`)
 * grants `action`. Reactive when read inside markup or a `$derived`.
 */
export function can(action: Action): boolean {
  return (page.data.capabilities ?? []).includes(action);
}
