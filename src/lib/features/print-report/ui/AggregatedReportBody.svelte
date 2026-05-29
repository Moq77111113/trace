<script lang="ts">
  import ReportHeader from './blocks/ReportHeader.svelte';
  import SummaryTile  from './blocks/SummaryTile.svelte';
  import RunRow       from './blocks/RunRow.svelte';
  import type { ExecutionExportRow, ExecutionFilters } from '$lib/server/executions/read/queries';
  import type { AggregatedScope } from '$lib/features/print-report/lib/scope';

  type Props = {
    data: {
      project: { name: string; slug: string };
      filters: ExecutionFilters;
      rows:    ExecutionExportRow[];
    };
    scope: AggregatedScope;
  };
  let { data, scope }: Props = $props();

  const visible = $derived(scope === 'failed' ? data.rows.filter((r) => r.status !== 'PASSED') : data.rows);
  const counts  = $derived({
    total:   data.rows.length,
    passed:  data.rows.filter((r) => r.status === 'PASSED').length,
    failed:  data.rows.filter((r) => r.status === 'FAILED').length,
    skipped: data.rows.filter((r) => r.status === 'SKIPPED').length,
  });
  const meta = $derived([
    ...(data.filters.environment ? [{ label: 'env',    value: data.filters.environment }] : []),
    ...(data.filters.source      ? [{ label: 'source', value: data.filters.source      }] : []),
    ...(data.filters.from        ? [{ label: 'from',   value: new Date(data.filters.from).toLocaleDateString() }] : []),
    ...(data.filters.to          ? [{ label: 'to',     value: new Date(data.filters.to).toLocaleDateString()   }] : []),
  ]);
</script>

<ReportHeader title={data.project.name} status={null} {meta} />
<SummaryTile label="Runs" total={counts.total} passed={counts.passed} failed={counts.failed} skipped={counts.skipped} />

{#if visible.length === 0}
  <p class="text-[13px] text-ink-3">No runs match these filters.</p>
{:else}
  <table class="w-full text-left border-collapse">
    <thead class="text-[11px] uppercase tracking-[0.07em] text-ink-3">
      <tr class="border-b border-border">
        <th class="py-2 pr-3 font-medium">status</th>
        <th class="py-2 pr-3 font-medium">code</th>
        <th class="py-2 pr-3 font-medium">feature</th>
        <th class="py-2 pr-3 font-medium">env</th>
        <th class="py-2 pr-3 font-medium">started</th>
        <th class="py-2 pr-3 font-medium">duration</th>
        <th class="py-2 pr-3 font-medium">p / f / s</th>
      </tr>
    </thead>
    <tbody>
      {#each visible as row (row.id)}
        <RunRow {row} projectSlug={data.project.slug} />
      {/each}
    </tbody>
  </table>
{/if}
