<script lang="ts">
  import { page }  from '$app/state';
  import PageTitle        from '$lib/shared/ui/PageTitle.svelte';
  import CiKeyEmptyState  from '$lib/features/ci-ingest/ui/CiKeyEmptyState.svelte';
  import CiCurlSnippet    from '$lib/features/ci-ingest/ui/CiCurlSnippet.svelte';
  import CiReference      from '$lib/features/ci-ingest/ui/CiReference.svelte';
  import * as m           from '$lib/paraglide/messages';

  let { data } = $props();

  const projectSlug = $derived(page.params.slug ?? '');
  const baseUrl     = $derived(typeof window === 'undefined' ? 'https://your-trace-instance' : window.location.origin);
</script>

<PageTitle title={m.page_title_executions_ci()} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <section class="max-w-3xl">
    <a
      href="/p/{projectSlug}/executions"
      class="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink mb-3"
    >
      ← Back to executions
    </a>

    <h1 class="text-[20px] font-semibold tracking-tight mb-1">CI ingestion</h1>
    <p class="text-[13px] text-ink-3 max-w-[56ch] mb-6">
      POST your <code class="font-mono text-ink-2">cucumber.json</code> from CI after each test job.
      One feature per call. The server matches by <code class="font-mono text-ink-2">Feature:</code>
      name (case-insensitive) within this project.
    </p>

    {#if !data.hasUsableKey}
      <CiKeyEmptyState {projectSlug} />
    {:else}
      <CiCurlSnippet {projectSlug} {baseUrl} />
      <CiReference />
    {/if}
  </section>
</div>
