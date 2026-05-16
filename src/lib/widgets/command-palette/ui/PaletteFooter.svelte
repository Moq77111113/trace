<script lang="ts">
  import Kbd from '$lib/shared/ui/Kbd.svelte';
</script>

<footer class="flex items-center gap-3 px-4 py-2 border-t border-border bg-canvas text-[11px] text-ink-3">
  <span class="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
  <span class="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
  <span class="ml-auto flex items-center gap-1"><Kbd>ESC</Kbd> close</span>
</footer>
