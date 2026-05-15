/**
 * Local-only user identity (D1 — no auth). Single localStorage key shared by
 * the feature editor (save attribution) and the run launcher (run attribution)
 * so the user is prompted once per browser, not once per surface.
 *
 * M6 replaces this with the authenticated session user; this module becomes a
 * fallback for anonymous flows or is removed entirely.
 */

const STORAGE_KEY = 'trace.identity';
const PROMPT_TEXT = 'Your name (used to attribute saves and runs):';

export function getStoredIdentity(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function setStoredIdentity(name: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, name);
}

/**
 * Returns the stored identity, prompting the user if absent. Returns `null`
 * if the user dismissed the prompt — callers should treat that as "abort the
 * action that triggered the lookup".
 */
export function ensureIdentity(): string | null {
  const stored = getStoredIdentity();
  if (stored) return stored;

  const entered = prompt(PROMPT_TEXT);
  if (!entered || !entered.trim()) return null;

  const trimmed = entered.trim();
  setStoredIdentity(trimmed);
  return trimmed;
}
