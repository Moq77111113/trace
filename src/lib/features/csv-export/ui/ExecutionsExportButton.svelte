<script lang="ts">
  import Button from '$lib/shared/ui/Button.svelte';
  import { EXPORT_ROW_CAP } from '$lib/features/csv-export/lib/csv';

  type Props = {
    href:  string;
    total: number;
  };

  let { href, total }: Props = $props();

  const empty    = $derived(total === 0);
  const tooMany  = $derived(total > EXPORT_ROW_CAP);
  const disabled = $derived(empty || tooMany);

  const title = $derived.by(() => {
    if (empty)    return 'No executions to export';
    if (tooMany)  return `Refine filters to under ${EXPORT_ROW_CAP.toLocaleString()} rows`;
    return `Export ${total.toLocaleString()} execution${total === 1 ? '' : 's'} as CSV`;
  });

  const label = $derived(empty ? 'Export CSV' : `Export CSV (${total.toLocaleString()})`);
</script>

{#if disabled}
  <Button variant="secondary" size="sm" disabled {title}>{label}</Button>
{:else}
  <Button variant="secondary" size="sm" {href} download {title}>{label}</Button>
{/if}
