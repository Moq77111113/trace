<script lang="ts">
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  let { data } = $props();
</script>

<section class="max-w-xl">
  <h2 class="text-lg font-semibold mb-1">Export project</h2>
  <p class="text-sm text-surface-400 mb-6">
    Download every active feature in this project as <code class="text-surface-200">.feature</code> files,
    bundled in a single zip. Archived features are excluded.
  </p>

  {#if data.featureCount === 0}
    <EmptyState title="No features to export">
      Create a feature first, then come back here.
    </EmptyState>
  {:else}
    <div class="rounded-md border border-surface-700 bg-surface-800 p-5 flex items-center gap-5">
      <div class="flex-1">
        <p class="text-sm text-surface-200">
          <strong class="text-surface-100">{data.featureCount}</strong>
          {data.featureCount === 1 ? 'feature' : 'features'} ready
        </p>
        <p class="text-xs text-surface-400 mt-1">Filename: <code>{data.archiveFilename}</code></p>
      </div>

      <a
        href={`/api/projects/${data.project.id}/export`}
        class="inline-flex items-center gap-2 h-9 px-4 text-sm rounded-md bg-accent-500 text-surface-950 font-medium hover:bg-accent-400 transition"
      >
        Download .zip
      </a>
    </div>
  {/if}
</section>
