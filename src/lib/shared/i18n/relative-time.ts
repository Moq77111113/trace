import * as m from '$lib/paraglide/messages';

export function relativeTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1)   return m.time_just_now();
  if (mins < 60)  return m.time_minutes_ago({ count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return m.time_hours_ago({ count: hours });
  const days  = Math.floor(hours / 24);
  if (days < 30)  return m.time_days_ago({ count: days });
  return date.toLocaleDateString();
}
