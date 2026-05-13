<script lang="ts" module>
  import { cva, type VariantProps } from 'class-variance-authority';

  export const button = cva(
    'inline-flex items-center justify-center gap-2 font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed',
    {
      variants: {
        variant: {
          primary:   'bg-accent-500 text-white hover:bg-accent-600',
          secondary: 'bg-surface-700 text-surface-100 hover:bg-surface-600 border border-surface-600',
          ghost:     'bg-transparent text-surface-100 hover:bg-surface-700',
          danger:    'bg-state-failed text-white hover:opacity-90',
        },
        size: {
          sm: 'h-7 px-2.5 text-xs',
          md: 'h-9 px-4 text-sm',
          lg: 'h-11 px-5 text-base',
        },
      },
      defaultVariants: { variant: 'primary', size: 'md' },
    },
  );

  export type ButtonVariants = VariantProps<typeof button>;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = HTMLButtonAttributes & ButtonVariants & {
    loading?:  boolean;
    children:  Snippet;
  };

  let {
    variant,
    size,
    loading = false,
    children,
    disabled,
    class: cls,
    ...rest
  }: Props = $props();

  const classes = $derived(button({ variant, size, class: cls }));
</script>

<button class={classes} disabled={disabled || loading} {...rest}>
  {#if loading}
    <span class="animate-spin" aria-hidden="true">⟳</span>
  {/if}
  {@render children()}
</button>
