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
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

  type Common = ButtonVariants & {
    children: Snippet;
    class?:   string;
  };

  type AsButton = Common & HTMLButtonAttributes & {
    href?:    never;
    loading?: boolean;
  };

  type AsLink = Common & HTMLAnchorAttributes & {
    href:      string;
    loading?:  never;
    disabled?: never;
    type?:     never;
  };

  type Props = AsButton | AsLink;

  const props: Props = $props();

  function isLink(p: Props): p is AsLink {
    return p.href !== undefined;
  }

  const classes = $derived(
    button({ variant: props.variant, size: props.size, class: props.class }),
  );
</script>

{#if isLink(props)}
  {@const { variant: _v, size: _s, class: _c, children, ...anchorRest } = props}
  <a class={classes} {...anchorRest}>
    {@render children()}
  </a>
{:else}
  {@const { variant: _v, size: _s, class: _c, children, loading = false, disabled, ...buttonRest } = props}
  <button class={classes} disabled={disabled || loading} {...buttonRest}>
    {#if loading}
      <span class="animate-spin" aria-hidden="true">⟳</span>
    {/if}
    {@render children()}
  </button>
{/if}
