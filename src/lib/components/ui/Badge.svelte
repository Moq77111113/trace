<script lang="ts" module>
  import { cva, type VariantProps } from 'class-variance-authority';

  export const badge = cva(
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium',
    {
      variants: {
        variant: {
          passed:           'bg-state-passed/20  text-state-passed',
          failed:           'bg-state-failed/20  text-state-failed',
          skipped:          'bg-state-skipped/20 text-state-skipped',
          running:          'bg-state-running/20 text-state-running',
          pending:          'bg-surface-700      text-surface-300',
          'source-manual':  'bg-surface-700      text-surface-200',
          'source-ci':      'bg-accent-500/20    text-accent-400',
          neutral:          'bg-surface-700      text-surface-200',
        },
      },
      defaultVariants: { variant: 'neutral' },
    },
  );

  export type BadgeVariants = VariantProps<typeof badge>;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = BadgeVariants & { children: Snippet };
  let { variant, children }: Props = $props();
</script>

<span class={badge({ variant })}>
  {@render children()}
</span>
