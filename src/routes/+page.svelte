<script lang="ts">
  import Card        from '$lib/components/ui/Card.svelte';
  import Badge       from '$lib/components/ui/Badge.svelte';
  import EmptyState  from '$lib/components/ui/EmptyState.svelte';
  import Button      from '$lib/components/ui/Button.svelte';

  let { data } = $props();

  type BadgeVariant = 'passed' | 'failed' | 'skipped' | 'neutral';

  function badgeVariant(s: string | null): BadgeVariant {
    if (s === 'PASSED')  return 'passed';
    if (s === 'FAILED')  return 'failed';
    if (s === 'SKIPPED') return 'skipped';
    return 'neutral';
  }
</script>

<section class="flex items-center justify-between mb-6">
  <h1 class="text-lg font-semibold">Projects</h1>
  <Button href="/projects/new">+ New project</Button>
</section>

{#if data.projects.length === 0}
  <EmptyState title="No projects yet">Create one to get started.</EmptyState>
{:else}
  <div class="grid grid-cols-3 gap-4 mb-10">
    {#each data.projects as p (p.id)}
      <Card href="/projects/{p.id}">
        <div class="font-semibold mb-1">{p.name}</div>
        <div class="text-xs text-surface-400 mb-2">{p.featureCount} features</div>
        {#if p.lastRunStatus}<Badge variant={badgeVariant(p.lastRunStatus)}>{p.lastRunStatus}</Badge>{/if}
      </Card>
    {/each}
  </div>
{/if}

<h2 class="text-base font-semibold mb-3">Recent runs</h2>
{#if data.recentRuns.length === 0}
  <EmptyState icon="Activity" title="No runs yet" />
{:else}
  <div class="bg-surface-800 border border-surface-600 rounded-md">
    {#each data.recentRuns as r (r.id)}
      <a href="/projects/{r.projectId}/runs/{r.id}" class="flex items-center gap-3 px-3 py-2 border-b border-surface-700 last:border-0 text-sm hover:bg-surface-700">
        <Badge variant={badgeVariant(r.status)}>{r.status}</Badge>
        <span class="flex-1">{r.featureName}</span>
        <span class="text-xs text-surface-400">{r.executedBy}</span>
      </a>
    {/each}
  </div>
{/if}
