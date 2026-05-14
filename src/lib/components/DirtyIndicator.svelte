<script lang="ts">
  type Props = { dirty: boolean };
  let { dirty }: Props = $props();
</script>

{#if dirty}<span class="text-state-running" title="Unsaved changes">●</span>{/if}
