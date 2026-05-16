import * as m from '$lib/paraglide/messages';

export type ErrorKind = 'not_found' | 'server' | 'other';

/** Maps an HTTP status to the visual + copy treatment used by `+error.svelte`. */
export function categorizeError(status: number): ErrorKind {
  if (status === 404) return 'not_found';
  if (status >= 500)  return 'server';
  return 'other';
}

export type ErrorCopy = {
  title:   string;
  eyebrow: string;
  heading: string;
  body:    string;
};

/** Builds the localized title/eyebrow/heading/body for the given status. */
export function errorCopy(status: number): ErrorCopy {
  const kind = categorizeError(status);
  const statusText = String(status);

  if (kind === 'not_found') {
    return {
      title:   m.error_page_title_404(),
      eyebrow: m.error_page_404_eyebrow(),
      heading: m.error_page_404_heading(),
      body:    m.error_page_404_body(),
    };
  }

  if (kind === 'server') {
    return {
      title:   m.error_page_title_5xx(),
      eyebrow: m.error_page_5xx_eyebrow({ status: statusText }),
      heading: m.error_page_5xx_heading(),
      body:    m.error_page_5xx_body(),
    };
  }

  return {
    title:   m.error_page_title_generic(),
    eyebrow: m.error_page_other_eyebrow({ status: statusText }),
    heading: m.error_page_other_heading(),
    body:    m.error_page_other_body(),
  };
}
