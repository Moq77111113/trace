<script lang="ts">
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Badge      from '$lib/components/ui/Badge.svelte';
  import Table      from '$lib/components/ui/Table.svelte';

  let { data } = $props();

  type Status = (typeof data)['runs'][number]['status'];

  function variantFor(s: Status): 'failed' | 'passed' | 'skipped' | 'neutral' {
    if (s === 'PASSED')  return 'passed';
    if (s === 'FAILED')  return 'failed';
    if (s === 'SKIPPED') return 'skipped';
    return 'neutral';
  }

  function duration(startedAt: Date, finishedAt: Date | null): string {
    if (!finishedAt) return '—';
    const ms = finishedAt.getTime() - startedAt.getTime();
    const s  = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m  = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}m ${rs}s`;
  }
</script>

<h2 class="text-base font-semibold mb-4">Runs</h2>

{#if data.runs.length === 0}
  <EmptyState title="No runs yet" />
{:else}
  <Table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>Status</th>
        <th>By</th>
        <th>Env</th>
        <th>Started</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>
      {#each data.runs as r (r.id)}
        <tr class="hover:bg-surface-700">
          <td>
            <a class="text-accent-400 hover:underline" href="/projects/{data.project.id}/runs/{r.id}">{r.featureName}</a>
          </td>
          <td><Badge variant={variantFor(r.status)}>{r.status}</Badge></td>
          <td class="text-xs text-surface-300">{r.executedBy}</td>
          <td class="text-xs text-surface-400">{r.environment ?? '—'}</td>
          <td class="text-xs text-surface-400">{new Date(r.startedAt).toLocaleString()}</td>
          <td class="text-xs text-surface-400">{duration(new Date(r.startedAt), r.finishedAt ? new Date(r.finishedAt) : null)}</td>
        </tr>
      {/each}
    </tbody>
  </Table>
{/if}
