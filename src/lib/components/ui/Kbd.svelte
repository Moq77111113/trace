<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<kbd class="inline-block px-1.5 py-0.5 text-xs font-mono bg-surface-700 border border-surface-600 rounded-sm text-surface-100">
  {@render children()}
</kbd>
