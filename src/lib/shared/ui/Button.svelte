<script lang="ts" module>
  import { cva, type VariantProps } from 'class-variance-authority';

  export const button = cva(
    'inline-flex items-center justify-center gap-2 font-medium rounded-md border whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    {
      variants: {
        variant: {
          primary:   'bg-accent text-accent-fg border-transparent hover:bg-accent-hover shadow-[0_1px_2px_var(--accent-ring),inset_0_-1px_0_oklch(0_0_0/0.08)]',
          secondary: 'bg-surface text-ink border-border hover:bg-surface-2 hover:border-border-strong',
          ghost:     'bg-transparent text-ink border-transparent hover:bg-surface',
          danger:    'bg-surface text-fail-ink border-border hover:bg-fail-soft hover:border-fail/30',
          pass:      'bg-pass-soft text-pass-ink border-pass/30 hover:bg-pass/15',
          fail:      'bg-fail-soft text-fail-ink border-fail/30 hover:bg-fail/15',
          skip:      'bg-skip-soft text-skip-ink border-skip/30 hover:bg-skip/15'
        },
        size: {
          sm: 'h-[26px] px-2.5 text-[12px]',
          md: 'h-[30px] px-3   text-[12.5px]',
          lg: 'h-[34px] px-3.5 text-[13px]'
        },
        iconOnly: {
          true:  'gap-0 p-0',
          false: ''
        }
      },
      compoundVariants: [
        { iconOnly: true, size: 'sm', class: 'w-[26px]' },
        { iconOnly: true, size: 'md', class: 'w-[30px]' },
        { iconOnly: true, size: 'lg', class: 'w-[34px]' }
      ],
      defaultVariants: { variant: 'secondary', size: 'md', iconOnly: false }
    }
  );

  export type ButtonVariants = VariantProps<typeof button>;
  export type ButtonVariant = NonNullable<ButtonVariants['variant']>;
  export type ButtonSize = NonNullable<ButtonVariants['size']>;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

  type Common = ButtonVariants & {
    class?:   string;
    children: Snippet;
  };

  type AsButton = Common & HTMLButtonAttributes & { href?: never };
  type AsLink = Common &
    HTMLAnchorAttributes & {
      href: string;
      disabled?: never;
      type?: never;
    };

  type Props = AsButton | AsLink;

  const props: Props = $props();

  function isLink(p: Props): p is AsLink {
    return p.href !== undefined;
  }

  const classes = $derived(
    button({
      variant:  props.variant,
      size:     props.size,
      iconOnly: props.iconOnly,
      class:    props.class
    })
  );
</script>

{#if isLink(props)}
  {@const { variant: _v, size: _s, iconOnly: _i, class: _c, children, ...anchorRest } = props}
  <a class={classes} {...anchorRest}>
    {@render children()}
  </a>
{:else}
  {@const { variant: _v, size: _s, iconOnly: _i, class: _c, children, ...buttonRest } = props}
  <button class={classes} {...buttonRest}>
    {@render children()}
  </button>
{/if}
