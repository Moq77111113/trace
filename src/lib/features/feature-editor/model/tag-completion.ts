import type * as Monaco from 'monaco-editor';

type ProjectTag    = { name: string; count: number };
type ParsedTagSet  = ReadonlySet<string>;

export function buildTagCompletion(
  projectTags: ProjectTag[],
  existing:    ParsedTagSet,
) {
  return (model: Monaco.editor.ITextModel, position: Monaco.Position): Monaco.languages.CompletionList => {
    const word  = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      startColumn:     word.startColumn,
      endLineNumber:   position.lineNumber,
      endColumn:       word.endColumn,
    };

    const lineBefore = model.getValueInRange({ ...range, startColumn: 1 });
    if (!lineBefore.includes('@')) return { suggestions: [] };

    const suggestions = projectTags.map((t) => ({
      label:      `@${t.name}`,
      kind:       17,
      insertText: t.name,
      detail:     `${t.count} feature${t.count === 1 ? '' : 's'}`,
      range,
      sortText:   existing.has(t.name)
        ? `b-${t.name}`
        : `a-${String(1_000_000 - t.count).padStart(7, '0')}`,
    }));

    return { suggestions };
  };
}
