<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div data-tbl class="bg-surface border border-border rounded-xl overflow-hidden">
  <table class="w-full text-[12.5px] text-left border-separate [border-spacing:0]">
    {@render children()}
  </table>
</div>
