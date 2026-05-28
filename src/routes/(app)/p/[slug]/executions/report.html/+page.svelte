<script lang="ts">
  import AggregatedReportBody from '$lib/features/print-report/ui/AggregatedReportBody.svelte';
  import ReportShell          from '$lib/features/print-report/ui/ReportShell.svelte';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<svelte:head>
  <title>{m.page_title_report_aggregated()}</title>
</svelte:head>

<ReportShell>
  <AggregatedReportBody {data} scope={data.scope} />
</ReportShell>
