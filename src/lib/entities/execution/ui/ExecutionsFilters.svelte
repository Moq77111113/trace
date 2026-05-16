<script lang="ts">
  import Select from '$lib/components/ui/Select.svelte';
  import { hasAnyExecutionFilter } from '$lib/executions/format';
  import type { ExecutionFilters } from '$lib/server/executions/queries';
  import type { RunsFilterNav } from '$lib/executions/filter-nav';

  type Option = { value: string; label: string };

  type Props = {
    filters:      ExecutionFilters;
    dateRange:    { from: string | null; to: string | null };
    environments: string[];
    features:     ReadonlyArray<{ id: string; name: string }>;
    groups:       ReadonlyArray<{ id: string; name: string }>;
    nav:          RunsFilterNav;
  };

  let { filters, dateRange, environments, features, groups, nav }: Props = $props();

  const statusOptions: Option[] = [
    { value: '',             label: 'Any status' },
    { value: 'PASSED',       label: 'Passed'     },
    { value: 'FAILED',       label: 'Failed'     },
    { value: 'SKIPPED',      label: 'Skipped'    },
    { value: 'ABORTED',      label: 'Aborted'    },
    { value: 'IN_PROGRESS',  label: 'Running'    },
  ];

  const sourceOptions: Option[] = [
    { value: '',        label: 'Any source' },
    { value: 'MANUAL',  label: 'Manual'     },
    { value: 'CI',      label: 'CI'         },
  ];

  const envOptions = $derived<Option[]>([
    { value: '', label: 'Any env' },
    ...environments.map((e) => ({ value: e, label: e })),
  ]);

  const featureOptions = $derived<Option[]>([
    { value: '', label: 'Any feature' },
    ...features.map((f) => ({ value: f.id, label: f.name })),
  ]);

  const groupOptions = $derived<Option[]>([
    { value: '',           label: 'Any group' },
    { value: 'ungrouped',  label: 'Ungrouped' },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ]);

  const hasFilter = $derived(hasAnyExecutionFilter(filters, dateRange));

  const dateInputClass =
    'h-[30px] px-2.5 text-[12.5px] rounded-md bg-surface text-ink border border-border hover:border-border-strong focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:border-accent';
</script>

<div class="flex flex-wrap items-center gap-2 mb-4">
  <Select value={filters.status      ?? ''} options={statusOptions}  placeholder="Status"      onValueChange={(v) => nav.setFilter('status',      v)} />
  <Select value={filters.source      ?? ''} options={sourceOptions}  placeholder="Source"      onValueChange={(v) => nav.setFilter('source',      v)} />
  <Select value={filters.environment ?? ''} options={envOptions}     placeholder="Environment" onValueChange={(v) => nav.setFilter('environment', v)} />
  <Select value={filters.featureId   ?? ''} options={featureOptions} placeholder="Feature"     onValueChange={(v) => nav.setFilter('feature',     v)} />
  <Select value={filters.groupId     ?? ''} options={groupOptions}   placeholder="Group"       onValueChange={(v) => nav.setFilter('group',       v)} />
  <input
    type="date"
    aria-label="From date"
    class={dateInputClass}
    value={dateRange.from ?? ''}
    max={dateRange.to ?? undefined}
    onchange={(e) => nav.setFilter('from', e.currentTarget.value)}
  />
  <input
    type="date"
    aria-label="To date"
    class={dateInputClass}
    value={dateRange.to ?? ''}
    min={dateRange.from ?? undefined}
    onchange={(e) => nav.setFilter('to', e.currentTarget.value)}
  />
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
