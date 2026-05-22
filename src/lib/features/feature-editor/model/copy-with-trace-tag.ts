import { TRACE_TAG_PREFIX, formatTraceTag } from '$lib/features/feature-import/lib/trace-tag';

type SelectionStart = { startLineNumber: number; startColumn: number };

export function decorateCopy(text: string, sel: SelectionStart, featureCode: string): string {
  if (sel.startLineNumber !== 1 || sel.startColumn !== 1) return text;
  if (text.startsWith(TRACE_TAG_PREFIX)) return text;
  return `${formatTraceTag(featureCode)}\n${text}`;
}
