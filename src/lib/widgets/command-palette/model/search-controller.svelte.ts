import type { executions } from '$lib/server/db/schema';

export type SearchResult = {
  featureId:   string;
  featureName: string;
  featureCode: string;
  projectId:   string;
  projectSlug: string;
  projectName: string;
  groupName:   string | null;
  status:      typeof executions.status.enumValues[number] | null;
};

export class CommandPaletteSearch {
  query:    string         = $state('');
  results:  SearchResult[]  = $state([]);
  selected: number          = $state(0);
  loading:  boolean         = $state(false);

  #pending:  ReturnType<typeof setTimeout> | undefined;
  #inflight: AbortController | undefined;

  reset = (): void => {
    if (this.#pending)  clearTimeout(this.#pending);
    if (this.#inflight) this.#inflight.abort();
    this.query    = '';
    this.results  = [];
    this.selected = 0;
    this.loading  = false;
  };

  scheduleSearch = (debounceMs = 150): void => {
    const q = this.query.trim();
    this.selected = 0;

    if (this.#pending)  clearTimeout(this.#pending);
    if (this.#inflight) this.#inflight.abort();

    if (!q) {
      this.results = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    this.#pending = setTimeout(() => void this.search(q), debounceMs);
  };

  moveDown = (): void => {
    if (this.results.length === 0) return;
    this.selected = (this.selected + 1) % this.results.length;
  };

  moveUp = (): void => {
    if (this.results.length === 0) return;
    this.selected = (this.selected - 1 + this.results.length) % this.results.length;
  };

  current = (): SearchResult | undefined => this.results[this.selected];

  private async search(q: string): Promise<void> {
    const ctrl = new AbortController();
    this.#inflight = ctrl;
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
      const body = (await res.json()) as { results: SearchResult[] };
      if (!ctrl.signal.aborted) this.results = body.results;
    } catch (err) {
      if (!(err instanceof Error) || err.name !== 'AbortError') this.results = [];
    } finally {
      if (!ctrl.signal.aborted) this.loading = false;
    }
  }
}
