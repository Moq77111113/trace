<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';

  type Props = { count: number };
  let { count }: Props = $props();
</script>

{#if count > 0}
  <Badge variant="failed">{count} error{count > 1 ? 's' : ''}</Badge>
{:else}
  <Badge variant="passed">valid</Badge>
{/if}
