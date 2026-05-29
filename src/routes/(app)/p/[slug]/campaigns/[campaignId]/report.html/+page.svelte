<script lang="ts">
  import CampaignReportBody from '$lib/features/print-report/ui/CampaignReportBody.svelte';
  import ReportShell        from '$lib/features/print-report/ui/ReportShell.svelte';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();
</script>

<svelte:head>
  <title>{m.page_title_report_campaign()}</title>
</svelte:head>

<ReportShell>
  <CampaignReportBody {data} scope={data.scope} />
</ReportShell>
