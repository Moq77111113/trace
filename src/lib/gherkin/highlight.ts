export type StepSegment =
  | { kind: 'plain'; value: string }
  | { kind: 'str';   value: string }
  | { kind: 'num';   value: string };

const TOKEN = /("[^"]*"|\b\d+(?:\.\d+)?\b)/g;

export function highlightStepText(text: string): StepSegment[] {
  if (!text) return [];

  const segments: StepSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ kind: 'plain', value: text.slice(lastIndex, start) });
    }

    const token = match[0];
    if (token.startsWith('"')) segments.push({ kind: 'str', value: token });
    else                       segments.push({ kind: 'num', value: token });

    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'plain', value: text.slice(lastIndex) });
  }

  return segments;
}
