<script lang="ts">
  type Props = { dirty: boolean };
  let { dirty }: Props = $props();
</script>

{#if dirty}
  <span
    class="inline-block w-1.5 h-1.5 rounded-full bg-accent"
    title="Unsaved changes"
    aria-label="Unsaved changes"
  ></span>
{/if}
