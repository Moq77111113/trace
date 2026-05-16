<script lang="ts">
  import Button             from '$lib/components/ui/Button.svelte';
  import Input              from '$lib/components/ui/Input.svelte';
  import Icon               from '$lib/components/ui/Icon.svelte';
  import PageTitle          from '$lib/components/PageTitle.svelte';
  import ApiKeyRow          from '$lib/features/api-keys/ui/ApiKeyRow.svelte';
  import CreatedKeyBanner   from '$lib/features/api-keys/ui/CreatedKeyBanner.svelte';
  import * as m             from '$lib/paraglide/messages';

  let { data, form } = $props();
</script>

<PageTitle title={m.page_title_api_keys()} />

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <div class="grid grid-cols-[220px_1fr] gap-7 max-w-[1100px] max-lg:grid-cols-[200px_1fr] max-lg:gap-6 max-md:grid-cols-[1fr] max-md:gap-4">
    <nav class="flex flex-col gap-px max-md:flex-row max-md:overflow-x-auto max-md:-mx-4 max-md:px-4 max-md:pb-2">
      <a
        href="#api-keys"
        aria-current="page"
        class="flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-md bg-surface text-ink font-medium shadow-[var(--shadow-1)]"
      >
        <Icon name="Key" size={13} /> API keys
      </a>
    </nav>

    <section>
      <h1 class="text-[16px] font-semibold tracking-tight mb-1">API keys</h1>
      <p class="text-[13px] text-ink-3 max-w-[56ch] mb-4">
        Bearer tokens for CI ingestion. Project-scoped. The raw secret is shown
        <strong class="text-ink-2 font-medium">once</strong> on creation — store it immediately.
      </p>

      {#if form?.createdKey}
        <CreatedKeyBanner rawKey={form.createdKey.key} />
      {/if}

      {#if form?.error}
        <p class="text-[12px] text-fail-ink mb-3">{form.error}</p>
      {/if}

      <form method="POST" action="?/create" class="flex flex-wrap items-end gap-2 mb-7">
        <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium flex-1 min-w-[160px]">
          Name
          <Input name="name" placeholder="prod-ci" required />
        </label>

        <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
          Expires (optional)
          <Input name="expiresAt" type="date" />
        </label>

        <Button type="submit" variant="primary">
          <Icon name="Plus" size={13} /> Create key
        </Button>
      </form>

      {#if data.keys.length === 0}
        <p class="text-[13px] text-ink-3">No API keys yet.</p>
      {:else}
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          {#each data.keys as k (k.id)}
            <ApiKeyRow {k} />
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>
