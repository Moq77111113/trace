export function formatDurationFromMs(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export function passRatePercent(passed: number, total: number): string {
  if (total === 0) return '—';
  const pct = Math.round((passed / total) * 100);
  return `${pct}%`;
}
