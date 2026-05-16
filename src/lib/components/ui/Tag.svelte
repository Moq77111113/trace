<script lang="ts">
  let { name }: { name: string } = $props();
</script>

<span
  class="inline-flex items-center font-mono text-[10.5px] leading-[1.4] px-1.5 rounded-sm bg-surface-2 text-ink-2 border border-border before:content-['@'] before:text-ink-3 before:mr-[1px]"
>{name}</span>
