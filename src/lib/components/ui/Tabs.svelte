<script lang="ts" generics="T extends string">
  import { Tabs as Bits } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = { value: T; onValueChange: (v: T) => void; items: { value: T; label: string }[]; children: Snippet };
  let { value, onValueChange, items, children }: Props = $props();
</script>

<Bits.Root bind:value={() => value, (v) => onValueChange(v as T)}>
  <Bits.List class="flex gap-0 border-b border-surface-700">
    {#each items as item (item.value)}
      <Bits.Trigger
        value={item.value}
        class="px-4 py-2.5 text-sm text-surface-400 border-b-2 border-transparent data-[state=active]:text-surface-100 data-[state=active]:border-accent-500"
      >
        {item.label}
      </Bits.Trigger>
    {/each}
  </Bits.List>

  {@render children()}
</Bits.Root>
