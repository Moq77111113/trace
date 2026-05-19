<script lang="ts">
  import { Dialog as Bits } from 'bits-ui';
  import { goto } from '$app/navigation';
  import SearchInput   from './SearchInput.svelte';
  import SearchResults from './SearchResults.svelte';
  import PaletteFooter from './PaletteFooter.svelte';
  import { CommandPaletteSearch, type SearchResult } from '../model/search-controller.svelte';

  type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  };

  let { open, onOpenChange }: Props = $props();

  const search = new CommandPaletteSearch();

  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (!open) {
      search.reset();
      return;
    }
    queueMicrotask(() => inputEl?.focus());
  });

  $effect(() => {
    void search.query;
    search.scheduleSearch();
  });

  function pick(r: SearchResult): void {
    onOpenChange(false);
    void goto(`/p/${r.projectSlug}/${r.featureCode}`);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') { e.preventDefault(); search.moveDown(); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); search.moveUp();   return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = search.current();
      if (hit) pick(hit);
    }
  }
</script>

<Bits.Root bind:open={() => open, onOpenChange}>
  <Bits.Portal>
    <Bits.Overlay class="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />

    <Bits.Content
      class="fixed left-1/2 top-[15vh] -translate-x-1/2 z-50 w-[640px] max-w-[92vw] bg-surface border border-border rounded-xl shadow-[var(--shadow-pop)] overflow-hidden"
    >
      <Bits.Title class="sr-only">Search</Bits.Title>

      <SearchInput bind:value={search.query} bind:inputRef={inputEl} onKeyDown={onKey} />

      <SearchResults
        query={search.query}
        loading={search.loading}
        results={search.results}
        selected={search.selected}
        onPick={pick}
        onHover={(i) => (search.selected = i)}
      />

      <PaletteFooter />
    </Bits.Content>
  </Bits.Portal>
</Bits.Root>
