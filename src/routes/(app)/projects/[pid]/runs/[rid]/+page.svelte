<script lang="ts">
  import LiveRun     from '$lib/components/LiveRun.svelte';
  import RunReadonly from '$lib/components/RunReadonly.svelte';

  let { data } = $props();
</script>

{#if data.mode === 'live'}
  <LiveRun {data} />
{:else}
  <RunReadonly {data} />
{/if}
