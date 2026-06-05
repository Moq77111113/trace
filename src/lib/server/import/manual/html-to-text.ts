const NAMED_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
};

/** Convert ATM/Jira HTML field content to plain text: <br>→newline, </p>→blank line, entities decoded, tags stripped. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n');

  const stripped = withBreaks.replace(/<[^>]+>/g, '');

  const numericDecoded = stripped.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
  const decoded = numericDecoded.replace(/&[a-z]+;/gi, (entity) => NAMED_ENTITIES[entity.toLowerCase()] ?? entity);

  return decoded
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
