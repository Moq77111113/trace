<script lang="ts">
  import AggregatedReportBody from '$lib/features/print-report/ui/AggregatedReportBody.svelte';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<svelte:head>
  <title>{m.page_title_report_aggregated()}</title>
</svelte:head>

<AggregatedReportBody {data} scope={data.scope} />
