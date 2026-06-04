<script lang="ts">
  let { children } = $props();
</script>

<div class="flex-1 min-h-0 overflow-y-auto">
  <div class="report-shell mx-auto max-w-[820px] px-8 py-10">
    {@render children()}
  </div>
</div>
