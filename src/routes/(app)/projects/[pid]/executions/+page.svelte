<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import EmptyState               from '$lib/shared/ui/EmptyState.svelte';
  import PageTitle                from '$lib/shared/ui/PageTitle.svelte';
  import ExecutionsFilters        from '$lib/widgets/executions-history/ui/ExecutionsFilters.svelte';
  import ExecutionsTable          from '$lib/widgets/executions-history/ui/ExecutionsTable.svelte';
  import ExecutionsPager          from '$lib/widgets/executions-history/ui/ExecutionsPager.svelte';
  import ExecutionsExportButton   from '$lib/features/csv-export/ui/ExecutionsExportButton.svelte';
  import * as m                   from '$lib/paraglide/messages';
  import { hasAnyExecutionFilter } from '$lib/entities/execution/lib/format';
  import { createExecutionsFilterNav } from '$lib/widgets/executions-history/lib/filter-nav';

  let { data } = $props();

  const nav = createExecutionsFilterNav(
    () => page.url,
    (target) => goto(target, { keepFocus: true, noScroll: true }),
  );

  const lastPage   = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
  const rangeStart = $derived(data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1);
  const rangeEnd   = $derived(Math.min(data.page * data.pageSize, data.total));
  const hasFilter  = $derived(hasAnyExecutionFilter(data.filters, data.dateRange));

  const exportHref = $derived.by(() => {
    const params = new URLSearchParams(page.url.searchParams);
    params.delete('page');
    const qs = params.toString();
    return `/projects/${data.project.id}/executions/export.csv${qs ? `?${qs}` : ''}`;
  });
</script>

<PageTitle title={m.page_title_executions()} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <header class="flex items-end justify-between gap-4 mb-4 max-md:flex-col max-md:items-stretch">
    <div>
      <h1 class="text-[20px] font-semibold tracking-tight">Runs</h1>
      <p class="text-[13px] text-ink-3 mt-1 tabular-nums">
        {#if data.total === 0}
          No executions yet
        {:else}
          Showing {rangeStart}–{rangeEnd} of {data.total}
        {/if}
      </p>
    </div>
    <div class="text-[12.5px]">
      <a href="/projects/{data.project.id}/executions/ci" class="text-accent-soft-ink hover:underline">
        CI ingest →
      </a>
    </div>
  </header>

  <ExecutionsFilters
    filters={data.filters}
    dateRange={data.dateRange}
    environments={data.environments}
    features={data.features}
    groups={data.groups}
    {nav}
  />

  {#if data.rows.length === 0}
    <EmptyState title={hasFilter ? 'No executions match these filters' : 'No executions yet'} />
  {:else}
    <ExecutionsTable rows={data.rows} projectId={data.project.id} flakeFeatureIds={data.flakeFeatureIds} />

    <footer class="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4 text-[12.5px]">
      <ExecutionsExportButton href={exportHref} total={data.total} />
      <ExecutionsPager page={data.page} {lastPage} onGoToPage={nav.goToPage} />
    </footer>
  {/if}
</div>
