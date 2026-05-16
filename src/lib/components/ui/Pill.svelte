<script lang="ts" module>
  export type PillKind =
    | 'pass'
    | 'fail'
    | 'skip'
    | 'pending'
    | 'running'
    | 'flake'
    | 'neutral'
    | 'brand';

  const COLOR: Record<PillKind, string> = {
    pass:    'bg-pass-soft    text-pass-ink',
    fail:    'bg-fail-soft    text-fail-ink',
    skip:    'bg-skip-soft    text-skip-ink',
    pending: 'bg-pending-soft text-pending-ink',
    running: 'bg-run-soft     text-run-ink',
    flake:   'bg-flake-soft   text-flake-ink',
    neutral: 'bg-surface-2    text-ink-2',
    brand:   'bg-accent-soft  text-accent-soft-ink'
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Status, { type StatusKind } from './Status.svelte';

  type Props = {
    kind?:    PillKind;
    glyph?:   boolean;
    outline?: boolean;
    class?:   string;
    children: Snippet;
  };

  let { kind = 'neutral', glyph = true, outline = false, class: cls = '', children }: Props =
    $props();

  const hasGlyph = $derived(glyph && kind !== 'neutral' && kind !== 'brand');

  const base =
    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11.5px] font-medium leading-tight whitespace-nowrap tabular-nums';
  const variant = $derived(
    outline
      ? `border border-current bg-transparent opacity-85 ${COLOR[kind].replace(/bg-\S+\s+/, '')}`
      : COLOR[kind]
  );
</script>

<span class="{base} {variant} {cls}">
  {#if hasGlyph}
    <Status kind={kind as StatusKind} size={10} />
  {/if}
  {@render children()}
</span>
