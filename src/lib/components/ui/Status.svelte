<script lang="ts" module>
  export type StatusKind = 'pass' | 'fail' | 'skip' | 'pending' | 'running' | 'flake';

  export function toStatusKind(status: string): StatusKind {
    const upper = status.toUpperCase();
    if (upper === 'PASSED')   return 'pass';
    if (upper === 'FAILED')   return 'fail';
    if (upper === 'SKIPPED')  return 'skip';
    if (upper === 'IN_PROGRESS')  return 'running';
    if (upper === 'FLAKE' || upper === 'FLAKY') return 'flake';
    return 'pending';
  }
</script>

<script lang="ts">
  type Props = {
    kind:   StatusKind;
    size?:  number;
    title?: string;
    class?: string;
  };

  let { kind, size = 14, title, class: cls = '' }: Props = $props();
</script>

<span
  class="inline-grid place-items-center shrink-0 {cls}"
  data-s={kind}
  style:width="{size}px"
  style:height="{size}px"
  aria-label={title ?? kind}
  role="img"
>
  {#if kind === 'pass'}
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="8" r="7" />
      <path d="M4.6 8.2 7 10.6l4.4-4.6" fill="none" stroke="var(--bg)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  {:else if kind === 'fail'}
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="8" r="7" />
      <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" fill="none" stroke="var(--bg)" stroke-width="1.9" stroke-linecap="round" />
    </svg>
  {:else if kind === 'skip'}
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="8" r="7" />
      <path d="M4.5 8h7" stroke="var(--bg)" stroke-width="1.9" stroke-linecap="round" />
    </svg>
  {:else if kind === 'pending'}
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2.4" />
    </svg>
  {:else if kind === 'running'}
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" stroke-width="1.4" opacity="0.25" />
      <path
        d="M8 1.8a6.2 6.2 0 0 1 6.2 6.2"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        class="origin-center [animation:spin_1.2s_linear_infinite]"
        style="transform-origin: 8px 8px"
      />
    </svg>
  {:else if kind === 'flake'}
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8 1 14.5 14h-13z" />
      <path d="M8 6v3.5" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round" />
      <circle cx="8" cy="11.6" r="0.8" fill="var(--bg)" />
    </svg>
  {/if}
</span>
