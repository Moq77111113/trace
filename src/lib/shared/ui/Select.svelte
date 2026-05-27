<script lang="ts">
  import { Select as Bits } from 'bits-ui';
  import Icon from './Icon.svelte';

  type Option = { value: string; label: string };
  type Props  = {
    value: string;
    onValueChange: (v: string) => void;
    options: Option[];
    placeholder?: string;
    name?: string;
    id?: string;
  };

  let { value, onValueChange, options, placeholder = 'Select…', name, id }: Props = $props();

  const rootExtra = $derived(name === undefined ? {} : { name });
  const triggerExtra = $derived(id === undefined ? {} : { id });
</script>

<Bits.Root type="single" {...rootExtra} bind:value={() => value, onValueChange}>
  <Bits.Trigger
    {...triggerExtra}
    role="combobox"
    class="inline-flex items-center justify-between gap-2 h-[30px] px-2.5 min-w-[140px] text-[12.5px] rounded-md bg-surface text-ink border border-border hover:border-border-strong cursor-pointer"
  >
    <span>{options.find((o) => o.value === value)?.label ?? placeholder}</span>
    <Icon name="ChevronDown" size={14} class="text-ink-3" />
  </Bits.Trigger>

  <Bits.Portal>
    <Bits.Content
      role="listbox"
      class="bg-surface border border-border rounded-lg shadow-[var(--shadow-pop)] min-w-[160px] p-1 z-50 max-h-60 overflow-auto"
    >
      {#each options as opt (opt.value)}
        <Bits.Item
          value={opt.value}
          role="option"
          aria-selected={opt.value === value}
          class="px-2.5 py-1.5 text-[12.5px] text-ink-2 rounded-sm cursor-pointer data-[highlighted]:bg-surface-2 data-[highlighted]:text-ink"
        >
          {opt.label}
        </Bits.Item>
      {/each}
    </Bits.Content>
  </Bits.Portal>
</Bits.Root>
