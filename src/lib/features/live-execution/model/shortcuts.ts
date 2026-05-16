import { isTypingTarget } from '$lib/shared/lib/dom';

export type ShortcutHandlers = {
  onPass:     () => void;
  onFail:     () => void;
  onSkip:     () => void;
  onJump:     () => void;
  onMoveDown: () => void;
  onMoveUp:   () => void;
  onFinish:   () => void;
};

export function attachLiveExecutionShortcuts(target: Window, handlers: ShortcutHandlers): () => void {
  const onKey = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return;

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handlers.onFinish();
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();
    if (key === 'p') { handlers.onPass();     return; }
    if (key === 'f') { handlers.onFail();     return; }
    if (key === 's') { handlers.onSkip();     return; }
    if (key === 'j') { handlers.onJump();     return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); handlers.onMoveDown(); return; }
    if (event.key === 'ArrowUp')   { event.preventDefault(); handlers.onMoveUp();   return; }
  };

  target.addEventListener('keydown', onKey);
  return () => target.removeEventListener('keydown', onKey);
}
