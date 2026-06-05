<script lang="ts">
  import Import from '$lib/features/feature-import/ui/Import.svelte';
  import ManualImportPanel from '$lib/features/import-manual/ui/ManualImportPanel.svelte';
  import PageTitle from '$lib/shared/ui/PageTitle.svelte';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();

  type Source = 'gherkin' | 'manual';
  const SOURCES: { value: Source; label: string }[] = [
    { value: 'gherkin', label: 'Gherkin .feature files' },
    { value: 'manual',  label: 'Manual corpus'          },
  ];

  let source = $state<Source>('gherkin');
</script>

{#if source === 'manual'}
  <PageTitle title={`${m.page_title_import()} · ${data.project.name}`} />
{/if}

<div class="flex-1 min-h-0 flex flex-col">
  <div class="flex items-center gap-1.5 px-7 pt-6 max-lg:px-6 max-md:px-4 shrink-0">
    {#each SOURCES as item (item.value)}
      <button
        type="button"
        onclick={() => (source = item.value)}
        class="h-[30px] px-3 text-[12.5px] rounded-md border transition-colors {source === item.value
          ? 'bg-surface text-ink border-border-strong'
          : 'bg-transparent text-ink-3 border-transparent hover:bg-surface'}"
      >
        {item.label}
      </button>
    {/each}
  </div>

  {#if source === 'gherkin'}
    <Import project={data.project} groups={data.tree.groups} />
  {:else}
    <div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
      <section class="max-w-5xl">
        <h1 class="text-[20px] font-semibold tracking-tight mb-1">Import a manual corpus</h1>
        <p class="text-[13px] text-ink-3 max-w-[64ch] mb-6">
          Upload an exported test corpus. Choose how scenarios group into features, review the tree,
          then commit. Nothing is written until you import.
        </p>
        <ManualImportPanel />
      </section>
    </div>
  {/if}
</div>
