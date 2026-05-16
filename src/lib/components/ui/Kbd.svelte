<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<kbd
  class="inline-block font-mono text-[10.5px] px-1.5 py-px rounded-sm bg-canvas text-ink-3 border border-border"
>{@render children()}</kbd>
