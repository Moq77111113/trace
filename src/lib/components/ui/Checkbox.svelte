<script lang="ts">
  import { Checkbox as Bits } from 'bits-ui';

  type Props = { checked: boolean; onCheckedChange: (v: boolean) => void; label?: string };
  let { checked, onCheckedChange, label }: Props = $props();
</script>

<label class="inline-flex items-center gap-2 cursor-pointer text-[12.5px] text-ink">
  <Bits.Root
    bind:checked={() => checked, onCheckedChange}
    class="w-4 h-4 rounded-[4px] border border-border-strong bg-surface inline-grid place-items-center text-accent-fg shrink-0 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
  >
    {#snippet children({ checked: isChecked })}
      {#if isChecked}
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 8.2 6.5 11l6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {/if}
    {/snippet}
  </Bits.Root>

  {#if label}<span class="leading-none">{label}</span>{/if}
</label>
