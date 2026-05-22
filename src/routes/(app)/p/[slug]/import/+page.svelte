<script lang="ts">
  import Import from '$lib/features/feature-import/ui/Import.svelte';

  let { data } = $props();
</script>

<Import project={data.project} groups={data.tree.groups} />
