<script lang="ts" module>
  import type { PillKind } from './Pill.svelte';

  export type BadgeVariant =
    | 'passed'
    | 'failed'
    | 'skipped'
    | 'running'
    | 'pending'
    | 'flake'
    | 'source-manual'
    | 'source-ci'
    | 'neutral';

  function toPillKind(variant: BadgeVariant | undefined): PillKind {
    if (variant === 'passed')        return 'pass';
    if (variant === 'failed')        return 'fail';
    if (variant === 'skipped')       return 'skip';
    if (variant === 'running')       return 'running';
    if (variant === 'pending')       return 'pending';
    if (variant === 'flake')         return 'flake';
    if (variant === 'source-ci')     return 'brand';
    if (variant === 'source-manual') return 'neutral';
    return 'neutral';
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Pill from './Pill.svelte';

  type Props = {
    variant?: BadgeVariant;
    glyph?:   boolean;
    children: Snippet;
  };

  let { variant, glyph = true, children }: Props = $props();
</script>

<Pill kind={toPillKind(variant)} {glyph}>
  {@render children()}
</Pill>
