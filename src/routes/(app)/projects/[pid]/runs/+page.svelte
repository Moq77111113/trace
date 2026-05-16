<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Pill       from '$lib/components/ui/Pill.svelte';
  import Table      from '$lib/components/ui/Table.svelte';
  import Select     from '$lib/components/ui/Select.svelte';
  import PageTitle  from '$lib/components/PageTitle.svelte';
  import * as m     from '$lib/paraglide/messages';
  import { formatRunDuration } from '$lib/runs/format';
  import { toStatusKind } from '$lib/components/ui/Status.svelte';
  import { createRunsFilterNav } from '$lib/runs/filter-nav';

  let { data } = $props();

  const nav = createRunsFilterNav(
    () => page.url,
    (target) => goto(target, { keepFocus: true, noScroll: true }),
  );

  const statusOptions = [
    { value: '',         label: 'Any status' },
    { value: 'PASSED',   label: 'Passed'     },
    { value: 'FAILED',   label: 'Failed'     },
    { value: 'SKIPPED',  label: 'Skipped'    },
    { value: 'RUNNING',  label: 'Running'    },
  ];

  const sourceOptions = [
    { value: '',        label: 'Any source' },
    { value: 'MANUAL',  label: 'Manual'     },
    { value: 'CI',      label: 'CI'         },
  ];

  const envOptions = $derived([
    { value: '', label: 'Any env' },
    ...data.environments.map((e) => ({ value: e, label: e })),
  ]);

  const featureOptions = $derived([
    { value: '', label: 'Any feature' },
    ...data.features.map((f) => ({ value: f.id, label: f.name })),
  ]);

  const groupOptions = $derived([
    { value: '',           label: 'Any group' },
    { value: 'ungrouped',  label: 'Ungrouped' },
    ...data.groups.map((g) => ({ value: g.id, label: g.name })),
  ]);

  const lastPage   = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
  const rangeStart = $derived(data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1);
  const rangeEnd   = $derived(Math.min(data.page * data.pageSize, data.total));

  const hasFilter = $derived(
    Boolean(data.filters.status) ||
    Boolean(data.filters.source) ||
    Boolean(data.filters.environment) ||
    Boolean(data.filters.featureId) ||
    Boolean(data.filters.groupId),
  );
</script>

<PageTitle title={m.page_title_runs()} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <header class="flex items-end justify-between gap-4 mb-4 max-md:flex-col max-md:items-stretch">
    <div>
      <h1 class="text-[20px] font-semibold tracking-tight">Runs</h1>
      <p class="text-[13px] text-ink-3 mt-1 tabular-nums">
        {#if data.total === 0}
          No runs yet
        {:else}
          Showing {rangeStart}–{rangeEnd} of {data.total}
        {/if}
      </p>
    </div>
    <div class="text-[12.5px]">
      <a
        href="/projects/{data.project.id}/runs/ci"
        class="text-accent-soft-ink hover:underline"
      >
        CI ingest →
      </a>
    </div>
  </header>

  <div class="flex flex-wrap items-center gap-2 mb-4">
    <Select value={data.filters.status      ?? ''} options={statusOptions}  placeholder="Status"      onValueChange={(v) => nav.setFilter('status',      v)} />
    <Select value={data.filters.source      ?? ''} options={sourceOptions}  placeholder="Source"      onValueChange={(v) => nav.setFilter('source',      v)} />
    <Select value={data.filters.environment ?? ''} options={envOptions}     placeholder="Environment" onValueChange={(v) => nav.setFilter('environment', v)} />
    <Select value={data.filters.featureId   ?? ''} options={featureOptions} placeholder="Feature"     onValueChange={(v) => nav.setFilter('feature',     v)} />
    <Select value={data.filters.groupId     ?? ''} options={groupOptions}   placeholder="Group"       onValueChange={(v) => nav.setFilter('group',       v)} />
    {#if hasFilter}
      <button
        type="button"
        class="text-[12px] text-ink-3 hover:text-ink underline-offset-2 hover:underline bg-transparent border-0 cursor-pointer"
        onclick={nav.clearAll}
      >
        Clear filters
      </button>
    {/if}
  </div>

  {#if data.rows.length === 0}
    <EmptyState title={hasFilter ? 'No runs match these filters' : 'No runs yet'} />
  {:else}
    <Table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Status</th>
          <th>Source</th>
          <th>By</th>
          <th>Env</th>
          <th>Started</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {#each data.rows as r (r.id)}
          <tr>
            <td>
              <a class="text-ink font-medium hover:text-accent-soft-ink" href="/projects/{data.project.id}/runs/{r.id}">
                {r.featureName}
              </a>
            </td>
            <td><Pill kind={toStatusKind(r.status)}>{r.status.toLowerCase()}</Pill></td>
            <td class="font-mono text-[11.5px] text-ink-2">{r.source}</td>
            <td class="text-[12px] text-ink-3">{r.executedBy}</td>
            <td class="text-[12px] text-ink-3">{r.environment ?? '—'}</td>
            <td class="text-[12px] text-ink-3">{new Date(r.startedAt).toLocaleString()}</td>
            <td class="text-[12px] text-ink-3 tabular-nums">{formatRunDuration(r.startedAt, r.finishedAt)}</td>
          </tr>
        {/each}
      </tbody>
    </Table>

    {#if lastPage > 1}
      <footer class="mt-4 flex items-center justify-between text-[12px] text-ink-3">
        <span class="tabular-nums">Page {data.page} of {lastPage}</span>
        <span class="flex items-center gap-3">
          <button
            type="button"
            class="text-ink-2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-0 cursor-pointer"
            disabled={data.page <= 1}
            onclick={() => nav.goToPage(data.page - 1)}
          >
            ← Prev
          </button>
          <button
            type="button"
            class="text-ink-2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-0 cursor-pointer"
            disabled={data.page >= lastPage}
            onclick={() => nav.goToPage(data.page + 1)}
          >
            Next →
          </button>
        </span>
      </footer>
    {/if}
  {/if}
</div>
