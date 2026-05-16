<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Input  from '$lib/components/ui/Input.svelte';
  import Pill   from '$lib/components/ui/Pill.svelte';
  import Icon   from '$lib/components/ui/Icon.svelte';

  let { data, form } = $props();

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function copyKey() {
    if (!form?.createdKey) return;
    await navigator.clipboard.writeText(form.createdKey.key);
    copied = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied = false), 1500);
  }
</script>

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
        <div class="bg-accent-soft border border-accent/25 rounded-lg px-3.5 py-3 mb-3.5 flex items-center gap-3 text-[12.5px] max-md:flex-wrap">
          <Icon name="Key" size={14} class="text-accent-soft-ink shrink-0" />
          <strong class="text-accent-soft-ink whitespace-nowrap">Copy now — shown once.</strong>
          <code
            class="flex-1 text-[12px] text-accent-soft-ink px-2.5 py-1.5 bg-accent/5 border border-accent/20 rounded-md font-mono select-all break-all max-md:order-3 max-md:w-full"
          >{form.createdKey.key}</code>
          <Button variant="secondary" size="sm" onclick={copyKey}>
            <Icon name="Copy" size={12} /> {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
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
            {@const expired = k.enabled && k.expiresAt && k.expiresAt.getTime() < Date.now()}
            <div class="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 border-t border-border first:border-t-0 max-lg:grid-cols-[1fr_auto_auto] max-md:grid-cols-[1fr_auto] max-md:gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-[13px] truncate">{k.name}</span>
                  {#if !k.enabled}<Pill kind="fail">revoked</Pill>{/if}
                  {#if expired}<Pill kind="fail">expired</Pill>{/if}
                </div>
                <div class="font-mono text-[12px] text-ink-3 mt-0.5">{k.start ?? '—'}</div>
              </div>
              <span class="text-[12px] text-ink-3 tabular-nums max-lg:hidden">
                created {k.createdAt.toLocaleDateString()}
              </span>
              <span class="text-[12px] text-ink-3 tabular-nums max-lg:hidden max-md:hidden">
                {#if k.lastRequest}
                  used {k.lastRequest.toLocaleDateString()}
                {:else}
                  never used
                {/if}
              </span>
              <span class="text-[12px] text-ink-3 tabular-nums max-md:hidden">
                {#if k.expiresAt}
                  expires {k.expiresAt.toLocaleDateString()}
                {:else}
                  no expiry
                {/if}
              </span>

              {#if k.enabled}
                <form method="POST" action="?/revoke">
                  <input type="hidden" name="id" value={k.id} />
                  <Button type="submit" variant="danger" size="sm">Revoke</Button>
                </form>
              {:else}
                <span></span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>
