<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';
  import type { RunPageData } from '$lib/server/runs/queries';

  type Props = { data: NonNullable<RunPageData> };
  let { data }: Props = $props();

  type BadgeVariant = 'passed' | 'failed' | 'skipped' | 'neutral';

  function badgeVariant(status: string): BadgeVariant {
    if (status === 'PASSED')  return 'passed';
    if (status === 'FAILED')  return 'failed';
    if (status === 'SKIPPED') return 'skipped';
    return 'neutral';
  }
</script>

<section class="p-6">
  <h2 class="text-lg font-semibold mb-2">{data.feature.name}</h2>
  <Badge variant={badgeVariant(data.run.status)}>{data.run.status}</Badge>
  <p class="mt-3 text-sm text-surface-400">
    Read-only run detail lands in M4. {data.scenarios.length} scenarios.
  </p>
</section>
