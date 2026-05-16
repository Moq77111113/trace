export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const ACCENTS = ['pink', 'amber', 'cyan', 'lime'] as const;
export type Accent = (typeof ACCENTS)[number];

export const DEFAULT_THEME: Theme = 'light';
export const DEFAULT_ACCENT: Accent = 'amber';

export const THEME_COOKIE = 'trace_theme';
export const ACCENT_COOKIE = 'trace_accent';

const ONE_YEAR = 60 * 60 * 24 * 365;

export function parseTheme(value: string | undefined | null): Theme {
  return value === 'dark' || value === 'light' ? value : DEFAULT_THEME;
}

export function parseAccent(value: string | undefined | null): Accent {
  return (ACCENTS as readonly string[]).includes(value ?? '')
    ? (value as Accent)
    : DEFAULT_ACCENT;
}

export function cookieAttrs(maxAge = ONE_YEAR): string {
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
