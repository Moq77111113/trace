<script lang="ts">
  import Pill    from '$lib/shared/ui/Pill.svelte';
  import Table   from '$lib/shared/ui/Table.svelte';
  import DistBar from '$lib/entities/execution/ui/DistBar.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import { formatExecutionDuration } from '$lib/entities/execution/lib/format';
  import { formatBranchCommit, type CiMetadata } from '$lib/entities/execution/lib/ci-metadata';

  type Row = {
    id:          string;
    status:      string;
    source:      string;
    executedBy:  string;
    environment: string | null;
    startedAt:   Date | string;
    finishedAt:  Date | string | null;
    ciMetadata:  CiMetadata | null;
    featureId:   string;
    featureName: string;
    featureCode: string;
    passed:      number;
    failed:      number;
    skipped:     number;
    pending:     number;
  };

  type Props = {
    rows:            ReadonlyArray<Row>;
    projectSlug:     string;
    flakeFeatureIds: Set<string>;
  };

  let { rows, projectSlug, flakeFeatureIds }: Props = $props();
</script>

<Table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>Status</th>
      <th>Source</th>
      <th>By</th>
      <th>Env</th>
      <th class="max-md:hidden">Branch@commit</th>
      <th>Started</th>
      <th>Duration</th>
    </tr>
  </thead>
  <tbody>
    {#each rows as r (r.id)}
      {@const branchCommit = formatBranchCommit(r.ciMetadata)}
      <tr>
        <td>
          <span class="inline-flex items-center gap-2">
            <span class="font-mono text-[11px] text-ink-3 tabular-nums">{r.featureCode}</span>
            <a class="text-ink font-medium hover:text-accent-soft-ink" href="/p/{projectSlug}/executions/{r.id}">
              {r.featureName}
            </a>
            {#if flakeFeatureIds.has(r.featureId)}
              <Pill kind="flake">flake</Pill>
            {/if}
          </span>
        </td>
        <td>
          <span class="inline-flex flex-col gap-1 items-start">
            <Pill kind={toStatusKind(r.status)}>{r.status.toLowerCase()}</Pill>
            <DistBar counts={{ passed: r.passed, failed: r.failed, skipped: r.skipped, pending: r.pending }} />
          </span>
        </td>
        <td class="font-mono text-[11.5px] text-ink-2">{r.source}</td>
        <td class="text-[12px] text-ink-3">{r.executedBy}</td>
        <td class="text-[12px] text-ink-3">{r.environment ?? '—'}</td>
        <td class="font-mono text-[11.5px] text-ink-3 max-md:hidden" title={r.ciMetadata?.commit ?? ''}>
          {branchCommit ?? '—'}
        </td>
        <td class="text-[12px] text-ink-3">{new Date(r.startedAt).toLocaleString()}</td>
        <td class="text-[12px] text-ink-3 tabular-nums">{formatExecutionDuration(r.startedAt, r.finishedAt)}</td>
      </tr>
    {/each}
  </tbody>
</Table>
