<script lang="ts">
  import LiveRun     from '$lib/components/LiveRun.svelte';
  import RunReadonly from '$lib/components/RunReadonly.svelte';
  import PageTitle   from '$lib/components/PageTitle.svelte';
  import * as m      from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<PageTitle title={m.page_title_run_detail()} />

{#if data.mode === 'live'}
  <LiveRun {data} />
{:else}
  <RunReadonly {data} />
{/if}
