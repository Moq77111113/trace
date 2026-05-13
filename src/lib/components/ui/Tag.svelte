<script lang="ts">
  let { name }: { name: string } = $props();
</script>

<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono text-state-running bg-surface-800 border border-surface-700">@{name}</span>
