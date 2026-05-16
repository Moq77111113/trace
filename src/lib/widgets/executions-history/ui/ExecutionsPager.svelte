<script lang="ts">
  type Props = {
    page:       number;
    lastPage:   number;
    onGoToPage: (n: number) => void;
  };

  let { page, lastPage, onGoToPage }: Props = $props();

  const btnClass = 'text-ink-2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-0 cursor-pointer';
</script>

{#if lastPage > 1}
  <nav class="flex items-center gap-3 text-[12px] text-ink-3" aria-label="Pagination">
    <span class="tabular-nums">Page {page} of {lastPage}</span>
    <button type="button" class={btnClass} disabled={page <= 1}        onclick={() => onGoToPage(page - 1)}>← Prev</button>
    <button type="button" class={btnClass} disabled={page >= lastPage} onclick={() => onGoToPage(page + 1)}>Next →</button>
  </nav>
{/if}
