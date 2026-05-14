<script lang="ts">
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Button     from '$lib/components/ui/Button.svelte';
  import Table      from '$lib/components/ui/Table.svelte';

  let { data } = $props();
</script>

<div class="flex items-center justify-between mb-4">
  <h2 class="text-base font-semibold">Features</h2>
  <Button href="/projects/{data.project.id}/features/new">+ New feature</Button>
</div>

{#if data.features.length === 0}
  <EmptyState title="No features yet" />
{:else}
  <Table>
    <thead><tr><th>Name</th><th>Updated</th></tr></thead>
    <tbody>
      {#each data.features as f (f.id)}
        <tr class="hover:bg-surface-700">
          <td><a class="text-accent-400 hover:underline" href="/projects/{f.projectId}/features/{f.id}">{f.name}</a></td>
          <td class="text-xs text-surface-400">{new Date(f.updatedAt).toLocaleString()}</td>
        </tr>
      {/each}
    </tbody>
  </Table>
{/if}
