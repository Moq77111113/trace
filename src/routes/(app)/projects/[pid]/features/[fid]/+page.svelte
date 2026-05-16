<script lang="ts">
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import FeatureEditor    from '$lib/components/FeatureEditor.svelte';
  import ExecutionLauncher      from '$lib/components/ExecutionLauncher.svelte';
  import FeatureExecutionsAside from '$lib/components/FeatureExecutionsAside.svelte';
  import PageTitle        from '$lib/components/PageTitle.svelte';

  let { data } = $props();

  let parseErrors = $state(untrack(() => data.feature.parseErrors));

  const featureHasErrors = $derived((parseErrors?.length ?? 0) > 0);
  const projectId        = $derived(page.params.pid ?? '');
</script>

<PageTitle title={data.feature.name} />

<div class="flex-1 min-h-0 grid grid-cols-[1fr_280px] max-xl:grid-cols-[1fr_240px] max-lg:grid-cols-[1fr]">
  <div class="flex flex-col min-h-0 min-w-0">
    <div class="flex items-center justify-end px-4 py-2 border-b border-border bg-bg">
      <ExecutionLauncher
        {projectId}
        featureId={data.feature.id}
        disabled={featureHasErrors}
      />
    </div>

    <FeatureEditor {data} onSaved={(feature) => { parseErrors = feature.parseErrors; }} />
  </div>

  <div class="max-lg:hidden">
    <FeatureExecutionsAside {projectId} recentRuns={data.recentRuns} />
  </div>
</div>
