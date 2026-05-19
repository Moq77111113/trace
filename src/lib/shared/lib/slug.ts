const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const SLUG_MIN = 2;
const SLUG_MAX = 40;
const PREFIX_MIN = 2;
const PREFIX_MAX = 15;

const SLUG_FALLBACK = 'project';

/** Kebab-case a free-form name, clamped to slug bounds. Falls back to 'project' when empty. */
export function kebab(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const seeded = base.length >= SLUG_MIN ? base : SLUG_FALLBACK;
  return seeded.slice(0, SLUG_MAX).replace(/-+$/, '');
}

/** Derive a short code prefix from a slug: first segment if 2+ chars, else the slug clamped. */
export function inferCodePrefix(slug: string): string {
  const first = slug.split('-')[0] ?? '';
  if (first.length >= PREFIX_MIN) return first.slice(0, PREFIX_MAX);
  if (slug.length <= PREFIX_MAX)  return slug;
  return slug.slice(0, PREFIX_MAX).replace(/-+$/, '');
}

export function isValidSlug(s: string): boolean {
  return s.length >= SLUG_MIN && s.length <= SLUG_MAX && KEBAB.test(s);
}

export function isValidCodePrefix(s: string): boolean {
  return s.length >= PREFIX_MIN && s.length <= PREFIX_MAX && KEBAB.test(s);
}

/** Render the user-facing code for a feature: `<prefix>-<seq>`. */
export function formatFeatureCode(codePrefix: string, codeSeq: number): string {
  return `${codePrefix}-${codeSeq}`;
}

const FEATURE_CODE = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)*)-(\d+)$/;

/** Inverse of {@link formatFeatureCode}: parse `auth-42` → `{ prefix: 'auth', seq: 42 }`. */
export function parseFeatureCode(code: string): { prefix: string; seq: number } | null {
  const m = code.match(FEATURE_CODE);
  if (!m || !m[1] || !m[2]) return null;
  return { prefix: m[1], seq: Number(m[2]) };
}
