<script lang="ts">
  import { page } from '$app/state';
  import BrandMark        from '$lib/shared/brand/BrandMark.svelte';
  import ErrorArt404      from '$lib/shared/brand/ErrorArt404.svelte';
  import ErrorArt5xx      from '$lib/shared/brand/ErrorArt5xx.svelte';
  import ErrorArtGeneric  from '$lib/shared/brand/ErrorArtGeneric.svelte';
  import PageTitle from '$lib/shared/ui/PageTitle.svelte';
  import Button    from '$lib/shared/ui/Button.svelte';
  import Pill      from '$lib/shared/ui/Pill.svelte';
  import * as m    from '$lib/paraglide/messages';
  import { categorizeError, errorCopy } from './error-page';

  const status  = $derived(page.status);
  const kind    = $derived(categorizeError(status));
  const copy    = $derived(errorCopy(status));
  const message = $derived(page.error?.message ?? '');
  const errorId = $derived(page.error?.errorId ?? '');
  const path    = $derived(page.url.pathname);
  const pillKind = $derived(
    kind === 'server' ? 'fail' : kind === 'not_found' ? 'skip' : 'neutral'
  );
</script>

<PageTitle title={copy.title} />

<section class="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
  <div class="w-full max-w-lg bg-surface border border-border rounded-xl p-7 shadow-(--shadow-2)">

    <header class="flex items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-2">
        <span class="w-[22px] h-[22px] rounded-md bg-accent text-accent-fg grid place-items-center shrink-0">
          <BrandMark size={18} />
        </span>
        <span class="font-semibold tracking-[-0.01em] text-[14px]">Trace</span>
      </div>
      <Pill kind={pillKind}>{copy.eyebrow}</Pill>
    </header>

    <figure class="relative h-[140px] mb-6 grid place-items-center overflow-hidden rounded-lg bg-canvas border border-border">
      {#if kind === 'not_found'}
        <ErrorArt404 />
      {:else if kind === 'server'}
        <ErrorArt5xx />
      {:else}
        <ErrorArtGeneric {status} />
      {/if}
    </figure>

    <h1 class="text-[20px] font-semibold tracking-tight mb-1.5">{copy.heading}</h1>
    <p class="text-[13px] text-ink-3 mb-5">{copy.body}</p>

    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 mb-6 text-[12px] font-mono">
      <dt class="text-ink-mute uppercase tracking-[0.08em] text-[10.5px] self-center">
        {m.error_page_path_label()}
      </dt>
      <dd class="text-ink-2 truncate">{path}</dd>
      {#if message}
        <dt class="text-ink-mute uppercase tracking-[0.08em] text-[10.5px] self-center">
          {m.error_page_message_label()}
        </dt>
        <dd class="text-ink-2 wrap-break-words">{message}</dd>
      {/if}
      {#if errorId}
        <dt class="text-ink-mute uppercase tracking-[0.08em] text-[10.5px] self-center">
          {m.error_page_id_label()}
        </dt>
        <dd class="text-ink-2 break-all">{errorId}</dd>
      {/if}
    </dl>

    <div class="flex items-center gap-2">
      <Button href="/projects" variant="primary">{m.error_page_cta_projects()}</Button>
      <Button href="/" variant="secondary">{m.error_page_cta_home()}</Button>
    </div>
  </div>
</section>
