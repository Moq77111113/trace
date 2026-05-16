export function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export function toDateOrNull(v: unknown): Date | null {
  if (v instanceof Date)       return v;
  if (typeof v === 'string')   return new Date(v);
  return null;
}

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateParam(raw: string | null): string | null {
  if (!raw || !DATE_PARAM_PATTERN.test(raw)) return null;
  const t = Date.parse(`${raw}T00:00:00Z`);
  return Number.isNaN(t) ? null : raw;
}

export function toStartOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function toEndOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}
