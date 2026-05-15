<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Badge      from '$lib/components/ui/Badge.svelte';
  import Table      from '$lib/components/ui/Table.svelte';
  import Select     from '$lib/components/ui/Select.svelte';
  import { formatRunDuration, statusBadgeVariant } from '$lib/runs/format';
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

<header class="flex items-center justify-between mb-4">
  <h2 class="text-base font-semibold">Runs</h2>
  <span class="flex items-center gap-4 text-xs text-surface-400">
    {#if data.total === 0}No runs{:else}{rangeStart}–{rangeEnd} of {data.total}{/if}
    <a class="underline hover:text-surface-200" href="/projects/{data.project.id}/runs/ci">CI ingest →</a>
  </span>
</header>

<div class="flex flex-wrap items-center gap-2 mb-4">
  <Select value={data.filters.status      ?? ''} options={statusOptions}  placeholder="Status"      onValueChange={(v) => nav.setFilter('status',      v)} />
  <Select value={data.filters.source      ?? ''} options={sourceOptions}  placeholder="Source"      onValueChange={(v) => nav.setFilter('source',      v)} />
  <Select value={data.filters.environment ?? ''} options={envOptions}     placeholder="Environment" onValueChange={(v) => nav.setFilter('environment', v)} />
  <Select value={data.filters.featureId   ?? ''} options={featureOptions} placeholder="Feature"     onValueChange={(v) => nav.setFilter('feature',     v)} />
  <Select value={data.filters.groupId     ?? ''} options={groupOptions}   placeholder="Group"       onValueChange={(v) => nav.setFilter('group',       v)} />
  {#if hasFilter}
    <button class="text-xs text-surface-400 underline hover:text-surface-200" onclick={nav.clearAll}>Clear</button>
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
        <tr class="hover:bg-surface-700">
          <td>
            <a class="text-accent-400 hover:underline" href="/projects/{data.project.id}/runs/{r.id}">{r.featureName}</a>
          </td>
          <td><Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge></td>
          <td class="text-xs text-surface-300">{r.source}</td>
          <td class="text-xs text-surface-300">{r.executedBy}</td>
          <td class="text-xs text-surface-400">{r.environment ?? '—'}</td>
          <td class="text-xs text-surface-400">{new Date(r.startedAt).toLocaleString()}</td>
          <td class="text-xs text-surface-400">{formatRunDuration(r.startedAt, r.finishedAt)}</td>
        </tr>
      {/each}
    </tbody>
  </Table>

  {#if lastPage > 1}
    <footer class="mt-4 flex items-center justify-between text-xs text-surface-400">
      <span>Page {data.page} of {lastPage}</span>
      <span class="flex gap-3">
        <button class="underline hover:text-surface-200 disabled:opacity-30 disabled:no-underline" disabled={data.page <= 1}        onclick={() => nav.goToPage(data.page - 1)}>← Prev</button>
        <button class="underline hover:text-surface-200 disabled:opacity-30 disabled:no-underline" disabled={data.page >= lastPage} onclick={() => nav.goToPage(data.page + 1)}>Next →</button>
      </span>
    </footer>
  {/if}
{/if}
