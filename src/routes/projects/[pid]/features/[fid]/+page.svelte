<script lang="ts">
  import FeatureEditor from '$lib/components/FeatureEditor.svelte';

  let { data } = $props();
</script>

<FeatureEditor {data} />
