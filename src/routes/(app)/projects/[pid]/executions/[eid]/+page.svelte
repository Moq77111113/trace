<script lang="ts">
  import LiveExecution     from '$lib/components/LiveExecution.svelte';
  import ExecutionReadonly from '$lib/components/ExecutionReadonly.svelte';
  import PageTitle   from '$lib/components/PageTitle.svelte';
  import * as m      from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<PageTitle title={m.page_title_execution_detail()} />

{#if data.mode === 'live'}
  <LiveExecution {data} />
{:else}
  <ExecutionReadonly {data} />
{/if}
