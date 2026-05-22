import { isTypingTarget } from '$lib/shared/lib/dom';

type Matcher = (event: KeyboardEvent) => boolean;

export function attachShortcut(target: Window, match: Matcher, handler: () => void): () => void {
  const onKey = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return;
    if (!match(event)) return;
    event.preventDefault();
    handler();
  };
  target.addEventListener('keydown', onKey);
  return () => target.removeEventListener('keydown', onKey);
}

export const onPlainKey = (key: string): Matcher => (event) =>
  !event.metaKey && !event.ctrlKey && !event.altKey
  && event.key.toLowerCase() === key.toLowerCase();

export const onPrimaryKey = (key: string): Matcher => (event) =>
  (event.metaKey || event.ctrlKey) && !event.altKey
  && event.key.toLowerCase() === key.toLowerCase();
