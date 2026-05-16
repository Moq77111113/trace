<script lang="ts">
  import Kbd from '$lib/shared/ui/Kbd.svelte';
</script>

<footer class="px-3.5 py-2.5 text-[11px] text-ink-3 flex items-center gap-1.5 border-t border-border flex-wrap">
  <Kbd>↑</Kbd><Kbd>↓</Kbd>
  <span class="ml-1">navigate</span>
  <span class="mx-1.5 text-ink-mute">·</span>
  <Kbd>J</Kbd> <span>next pending</span>
  <span class="mx-1.5 text-ink-mute">·</span>
  <Kbd>P</Kbd> <span>pass</span>
  <span class="mx-1.5 text-ink-mute">·</span>
  <Kbd>F</Kbd> <span>fail</span>
  <span class="mx-1.5 text-ink-mute">·</span>
  <Kbd>S</Kbd> <span>skip</span>
</footer>
