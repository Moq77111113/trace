<script lang="ts">
  import { untrack } from 'svelte';
  import PageTitle from '$lib/shared/ui/PageTitle.svelte';
  import DropStage    from './DropStage.svelte';
  import PreviewStage from './PreviewStage.svelte';
  import OutcomeView  from './OutcomeView.svelte';
  import { createImportState } from '../model/import-state.svelte';
  import { provideImport } from '../model/context';
  import * as m from '$lib/paraglide/messages';

  type Project = { id: string; name: string };
  type GroupNode = { group: { name: string } };

  type Props = {
    project: Project;
    groups:  GroupNode[];
  };

  let { project, groups }: Props = $props();

  const flow = untrack(() => createImportState());
  provideImport(flow);
  const existingGroups = $derived(groups.map((g) => g.group.name));
</script>

<PageTitle title={`${m.page_title_import()} · ${project.name}`} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <section class="max-w-5xl">
    <h1 class="text-[20px] font-semibold tracking-tight mb-1">Import .feature files</h1>
    <p class="text-[13px] text-ink-3 max-w-[64ch] mb-6">
      Drop up to 100 files at once. Parse + collision check runs server-side. Nothing is written
      until you commit. Per-file commit is atomic, one bad file does not block siblings.
    </p>

    {#if flow.outcome}
      <OutcomeView />
    {:else if flow.preview}
      <PreviewStage {existingGroups} />
    {:else}
      <DropStage />
    {/if}
  </section>
</div>
