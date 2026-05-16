<script lang="ts">
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import FeatureEditor from '$lib/components/FeatureEditor.svelte';
  import RunLauncher   from '$lib/components/RunLauncher.svelte';

  let { data } = $props();

  let parseErrors = $state(untrack(() => data.feature.parseErrors));

  const featureHasErrors = $derived((parseErrors?.length ?? 0) > 0);
</script>

<div class="flex-1 min-h-0 flex flex-col">
  <div class="flex items-center justify-end px-4 py-2 border-b border-border bg-bg">
    <RunLauncher
      projectId={page.params.pid ?? ''}
      featureId={data.feature.id}
      disabled={featureHasErrors}
    />
  </div>

  <FeatureEditor {data} onSaved={(feature) => { parseErrors = feature.parseErrors; }} />
</div>
