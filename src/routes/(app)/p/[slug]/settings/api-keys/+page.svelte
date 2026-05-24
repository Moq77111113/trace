<script lang="ts">
  import Button             from '$lib/shared/ui/Button.svelte';
  import Input              from '$lib/shared/ui/Input.svelte';
  import Icon               from '$lib/shared/ui/Icon.svelte';
  import PageTitle          from '$lib/shared/ui/PageTitle.svelte';
  import ApiKeyRow          from '$lib/features/api-keys/ui/ApiKeyRow.svelte';
  import CreatedKeyBanner   from '$lib/features/api-keys/ui/CreatedKeyBanner.svelte';
  import * as m             from '$lib/paraglide/messages';

  let { data, form } = $props();
</script>

<PageTitle title={m.page_title_api_keys()} />

<h1 class="text-[16px] font-semibold tracking-tight mb-1">API keys</h1>
<p class="text-[13px] text-ink-3 max-w-[56ch] mb-4">
  Bearer tokens for CI ingestion. Project-scoped. The raw secret is shown
  <strong class="text-ink-2 font-medium">once</strong> on creation, store it immediately.
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
