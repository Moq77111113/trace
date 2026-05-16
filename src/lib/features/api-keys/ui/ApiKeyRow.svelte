<script lang="ts">
  import Button from '$lib/shared/ui/Button.svelte';
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import Icon   from '$lib/shared/ui/Icon.svelte';
  import type { ApiKeyRow as ApiKeyRowData } from '$lib/server/api-keys';

  type Props = { k: ApiKeyRowData };
  let { k }: Props = $props();

  const expired = $derived(k.enabled && k.expiresAt !== null && k.expiresAt.getTime() < Date.now());
</script>

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
    <div class="flex items-center gap-1.5">
      <form method="POST" action="?/rotate">
        <input type="hidden" name="id" value={k.id} />
        <Button type="submit" variant="secondary" size="sm" title="Create a new key with the same name + expiry, then revoke this one">
          <Icon name="RefreshCw" size={12} /> Rotate
        </Button>
      </form>
      <form method="POST" action="?/revoke">
        <input type="hidden" name="id" value={k.id} />
        <Button type="submit" variant="danger" size="sm">Revoke</Button>
      </form>
    </div>
  {:else}
    <span></span>
  {/if}
</div>
