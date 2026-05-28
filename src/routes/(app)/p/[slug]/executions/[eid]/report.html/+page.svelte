<script lang="ts">
  import RunReportBody from '$lib/features/print-report/ui/RunReportBody.svelte';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<svelte:head>
  <title>{m.page_title_report_run()}</title>
</svelte:head>

<RunReportBody {data} scope={data.scope} />
