<script lang="ts">
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import FeatureEditor    from '$lib/features/feature-editor/ui/FeatureEditor.svelte';
  import ExecutionLauncher      from '$lib/features/execution-launcher/ui/ExecutionLauncher.svelte';
  import FeatureExecutionsAside from '$lib/widgets/feature-executions-aside/ui/FeatureExecutionsAside.svelte';
  import PageTitle        from '$lib/shared/ui/PageTitle.svelte';

  let { data } = $props();

  let parseErrors = $state(untrack(() => data.feature.parseErrors));

  const featureHasErrors = $derived((parseErrors?.length ?? 0) > 0);
  const projectSlug      = $derived(page.params.slug ?? '');
</script>

<PageTitle title={data.feature.name} />

<div class="flex-1 min-h-0 grid grid-cols-[1fr_280px] max-xl:grid-cols-[1fr_240px] max-lg:grid-cols-[1fr]">
  <div class="flex flex-col min-h-0 min-w-0">
    <div class="flex items-center justify-end px-4 py-2 border-b border-border bg-bg">
      <ExecutionLauncher
        {projectSlug}
        featureId={data.feature.id}
        disabled={featureHasErrors}
      />
    </div>

    {#key data.feature.id}
      <FeatureEditor {data} onSaved={(feature) => { parseErrors = feature.parseErrors; }} />
    {/key}
  </div>

  <div class="max-lg:hidden">
    <FeatureExecutionsAside {projectSlug} recentRuns={data.recentRuns} />
  </div>
</div>
