type Navigate = (target: string) => void;
type GetUrl   = () => URL;

/** Glues filter UI to query string + navigation. Reset to page 1 on any filter change. */
export function createExecutionsFilterNav(getUrl: GetUrl, navigate: Navigate) {
  function withParams(mutate: (p: URLSearchParams) => void): string {
    const params = new URLSearchParams(getUrl().searchParams);
    mutate(params);
    return `?${params.toString()}`;
  }

  return {
    setFilter(key: string, value: string): void {
      navigate(withParams((p) => {
        if (value) p.set(key, value); else p.delete(key);
        p.delete('page');
      }));
    },

    clearAll(): void {
      navigate(getUrl().pathname);
    },

    goToPage(n: number): void {
      navigate(withParams((p) => p.set('page', String(n))));
    },
  };
}

export type RunsFilterNav = ReturnType<typeof createExecutionsFilterNav>;
