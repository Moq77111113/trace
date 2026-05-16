<script lang="ts">
  import LiveExecution     from '$lib/features/live-execution/ui/LiveExecution.svelte';
  import ExecutionReadonly from '$lib/features/execution-replay/ui/ExecutionReadonly.svelte';
  import PageTitle   from '$lib/shared/ui/PageTitle.svelte';
  import * as m      from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<PageTitle title={m.page_title_execution_detail()} />

{#if data.mode === 'live'}
  <LiveExecution {data} />
{:else}
  <ExecutionReadonly {data} />
{/if}
