<script lang="ts">
  import Icon from '$lib/shared/ui/Icon.svelte';

  type Option = { label: string; scope: string | null };

  type Props = { href: string; options: Option[] };
  let { href, options }: Props = $props();

  let open = $state(false);

  function urlFor(scope: string | null): string {
    if (!scope) return href;
    const u = new URL(href, 'http://x');
    u.searchParams.set('scope', scope);
    return u.pathname + (u.search ? u.search : '');
  }
</script>

<div class="relative inline-flex items-stretch">
  <a {href} target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] border border-border rounded-l-md hover:bg-surface-2">
    <Icon name="File" size={13} />
    Report
  </a>
  <button
    type="button"
    aria-label="Open report options"
    onclick={() => (open = !open)}
    class="inline-flex items-center px-1.5 border border-l-0 border-border rounded-r-md hover:bg-surface-2"
  >
    <Icon name="ChevronDown" size={13} />
  </button>

  {#if open}
    <ul class="absolute top-full right-0 mt-1 z-10 min-w-[160px] bg-bg border border-border rounded-md shadow-md list-none p-1 m-0">
      {#each options as opt (opt.label)}
        <li>
          <a
            href={urlFor(opt.scope)}
            target="_blank"
            rel="noopener"
            class="block px-2 py-1.5 text-[12.5px] rounded hover:bg-surface-2"
            onclick={() => (open = false)}
          >
            {opt.label}
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
