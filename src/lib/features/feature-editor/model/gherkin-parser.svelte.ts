import { parse } from '$lib/shared/gherkin/parse';
import { buildSnippets, type Snippet } from '$lib/shared/gherkin/snippets';
import type { ParseResult } from '$lib/shared/gherkin/types';
import { buildTagCompletion } from './tag-completion';

type ProjectTag = { name: string; count: number };

const DEBOUNCE_MS = 300;

export class GherkinParser {
  parsed: ParseResult = $state({ name: null, scenarios: [], tags: [], errors: [] });
  readonly snippets:    Snippet[];

  private readonly getContent:  () => string;
  private readonly projectTags: ProjectTag[];
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(getContent: () => string, featureName: string, projectTags: ProjectTag[]) {
    this.getContent  = getContent;
    this.projectTags = projectTags;
    this.snippets    = buildSnippets(featureName);
    this.parsed      = parse(getContent());

    $effect(() => {
      const next = this.getContent();
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => { this.parsed = parse(next); }, DEBOUNCE_MS);
    });
  }

  get empty(): boolean {
    return this.getContent().trim() === '';
  }

  readonly markers = $derived.by(() =>
    this.parsed.errors.map((e) =>
      e.column === undefined
        ? { line: e.line, message: e.message }
        : { line: e.line, column: e.column, message: e.message },
    ),
  );

  readonly completionProvider = $derived.by(() =>
    buildTagCompletion(this.projectTags, new Set(this.parsed.tags)),
  );
}
