<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="bg-surface-800 border border-surface-600 rounded-md overflow-hidden">
  <table class="w-full text-sm text-left">{@render children()}</table>
</div>

<style>
  :global(thead)    { background: var(--color-surface-700); }
  :global(thead th) { padding: 0.5rem 0.75rem; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-surface-400); font-weight: 600; }
  :global(tbody td) { padding: 0.625rem 0.75rem; border-top: 1px solid var(--color-surface-700); }
</style>
