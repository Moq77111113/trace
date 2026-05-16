<script lang="ts" generics="T extends string">
  import { Tabs as Bits } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = {
    value: T;
    onValueChange: (v: T) => void;
    items: { value: T; label: string }[];
    children: Snippet;
  };
  let { value, onValueChange, items, children }: Props = $props();
</script>

<Bits.Root bind:value={() => value, (v) => onValueChange(v as T)}>
  <Bits.List class="flex gap-0 border-b border-border">
    {#each items as item (item.value)}
      <Bits.Trigger
        value={item.value}
        class="px-3.5 py-2 text-[12.5px] text-ink-3 border-b-2 border-transparent hover:text-ink-2 data-[state=active]:text-ink data-[state=active]:border-accent"
      >
        {item.label}
      </Bits.Trigger>
    {/each}
  </Bits.List>

  {@render children()}
</Bits.Root>
