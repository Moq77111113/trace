export const TRACE_TAG_PREFIX = '@trace=';

export function formatTraceTag(featureCode: string): string {
  return `${TRACE_TAG_PREFIX}${featureCode}`;
}

const TRACE_TAG_HEAD = new RegExp(`^${TRACE_TAG_PREFIX}[a-z][a-z0-9-]*-\\d+\\s*$`, 'im');
const TRACE_TAG_LINE = new RegExp(`^${TRACE_TAG_PREFIX}[a-z][a-z0-9-]*-\\d+\\s*$`, 'i');

export function prependTraceTag(content: string, featureCode: string): string {
  const head = content.split('\n').slice(0, 5).join('\n');
  if (TRACE_TAG_HEAD.test(head)) return content;
  return `${formatTraceTag(featureCode)}\n${content}`;
}

export function stripTraceTag(content: string): string {
  const lines = content.split('\n');
  const head  = Math.min(5, lines.length);
  for (let i = 0; i < head; i++) {
    const line = lines[i] ?? '';
    if (TRACE_TAG_LINE.test(line)) {
      lines.splice(i, 1);
      return lines.join('\n');
    }
  }
  return content;
}
