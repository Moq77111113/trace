<script lang="ts">
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import FeatureEditor from '$lib/components/FeatureEditor.svelte';
  import RunLauncher   from '$lib/components/RunLauncher.svelte';

  let { data } = $props();

  // Track parse-error state separately so RunLauncher's `disabled` reflects the
  // most recent save without forcing a full load() round-trip.
  let parseErrors = $state(untrack(() => data.feature.parseErrors));

  const featureHasErrors = $derived((parseErrors?.length ?? 0) > 0);
</script>

<div class="flex justify-end mb-4">
  <RunLauncher
    projectId={page.params.pid ?? ''}
    featureId={data.feature.id}
    disabled={featureHasErrors}
  />
</div>

<FeatureEditor {data} onSaved={(feature) => { parseErrors = feature.parseErrors; }} />
