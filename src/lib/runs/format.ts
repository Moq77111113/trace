export type BadgeVariant = 'passed' | 'failed' | 'skipped' | 'running' | 'neutral';

export function statusBadgeVariant(status: string): BadgeVariant {
  if (status === 'PASSED')  return 'passed';
  if (status === 'FAILED')  return 'failed';
  if (status === 'SKIPPED') return 'skipped';
  if (status === 'RUNNING') return 'running';
  return 'neutral';
}

export function statusIcon(status: string): string {
  if (status === 'PASSED')  return '✓';
  if (status === 'FAILED')  return '✗';
  if (status === 'SKIPPED') return '↷';
  return '○';
}

export function formatScenarioDuration(ms: number | null): string {
  if (ms === null) return '';
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatRunDuration(startedAt: Date | string, finishedAt: Date | string | null): string {
  if (!finishedAt) return '—';
  const start = typeof startedAt  === 'string' ? new Date(startedAt)  : startedAt;
  const end   = typeof finishedAt === 'string' ? new Date(finishedAt) : finishedAt;
  const s = Math.round((end.getTime() - start.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}
