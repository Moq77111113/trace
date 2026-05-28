<script lang="ts">
  import Pill from '$lib/shared/ui/Pill.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import { formatExecutionDuration } from '$lib/entities/execution/lib/format';
  import type { ExecutionExportRow } from '$lib/server/executions/read/queries';

  type Props = { row: ExecutionExportRow; projectSlug: string };
  let { row, projectSlug }: Props = $props();

  const kind = $derived(toStatusKind(row.status));
  const href = $derived(`/p/${projectSlug}/executions/${row.id}/report.html`);
</script>

<tr class="border-b border-border align-top">
  <td class="py-2 pr-3"><Pill {kind}>{row.status.toLowerCase()}</Pill></td>
  <td class="py-2 pr-3 font-mono text-[12px] tabular-nums">
    <a {href} class="text-accent-soft-ink hover:underline">{row.featureCode}</a>
  </td>
  <td class="py-2 pr-3 text-[13px]">{row.featureName}</td>
  <td class="py-2 pr-3 text-[12px] text-ink-3">{row.environment ?? ''}</td>
  <td class="py-2 pr-3 text-[12px] text-ink-3 tabular-nums">{new Date(row.startedAt).toLocaleString()}</td>
  <td class="py-2 pr-3 text-[12px] text-ink-3 tabular-nums">{formatExecutionDuration(row.startedAt, row.finishedAt)}</td>
  <td class="py-2 pr-3 text-[12px] tabular-nums">{row.passed} / {row.failed} / {row.skipped}</td>
</tr>
