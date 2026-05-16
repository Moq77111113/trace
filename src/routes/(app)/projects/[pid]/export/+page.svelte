<script lang="ts">
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Icon       from '$lib/components/ui/Icon.svelte';
  import PageTitle  from '$lib/components/PageTitle.svelte';
  import * as m     from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<PageTitle title={`${m.page_title_export()} · ${data.project.name}`} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <section class="max-w-xl">
    <h1 class="text-[20px] font-semibold tracking-tight mb-1">Export project</h1>
    <p class="text-[13px] text-ink-3 max-w-[56ch] mb-6">
      Download every active feature in this project as <code class="font-mono text-ink-2">.feature</code> files,
      bundled in a single zip. Archived features are excluded.
    </p>

    {#if data.featureCount === 0}
      <EmptyState title="No features to export">
        Create a feature first, then come back here.
      </EmptyState>
    {:else}
      <div class="bg-surface border border-border rounded-xl p-5 flex items-center gap-5 max-md:flex-col max-md:items-start">
        <div class="flex-1">
          <p class="text-[14px] text-ink">
            <strong class="font-semibold">{data.featureCount}</strong>
            {data.featureCount === 1 ? 'feature' : 'features'} ready
          </p>
          <p class="text-[12px] text-ink-3 mt-1">
            Filename: <code class="font-mono">{data.archiveFilename}</code>
          </p>
        </div>

        <a
          href={`/api/projects/${data.project.id}/export`}
          class="inline-flex items-center gap-2 h-[34px] px-3.5 text-[13px] font-medium rounded-md bg-accent text-accent-fg hover:bg-accent-hover border border-transparent shadow-[0_1px_2px_var(--accent-ring),inset_0_-1px_0_oklch(0_0_0/0.08)]"
        >
          <Icon name="Download" size={13} /> Download .zip
        </a>
      </div>
    {/if}
  </section>
</div>
