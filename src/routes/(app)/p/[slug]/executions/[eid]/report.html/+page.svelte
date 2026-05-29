<script lang="ts">
  import RunReportBody from '$lib/features/print-report/ui/RunReportBody.svelte';
  import ReportShell   from '$lib/features/print-report/ui/ReportShell.svelte';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<svelte:head>
  <title>{m.page_title_report_run()}</title>
</svelte:head>

<ReportShell>
  <RunReportBody {data} scope={data.scope} />
</ReportShell>
