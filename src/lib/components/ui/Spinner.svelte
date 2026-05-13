<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<span
  class="inline-block animate-spin"
  style="width:{size}px;height:{size}px;border:2px solid var(--color-surface-600);border-top-color:var(--color-accent-500);border-radius:50%;"
></span>
