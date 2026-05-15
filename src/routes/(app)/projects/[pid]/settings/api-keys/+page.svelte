<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Input  from '$lib/components/ui/Input.svelte';
  import Badge  from '$lib/components/ui/Badge.svelte';

  let { data, form } = $props();
</script>

<section class="max-w-2xl">
  <h2 class="text-lg font-semibold mb-1">API keys</h2>
  <p class="text-sm text-surface-400 mb-6">
    Bearer tokens for CI ingestion. Project-scoped. The raw secret is shown <strong>once</strong> on creation — store it immediately.
  </p>

  {#if form?.createdKey}
    <div class="p-4 mb-6 bg-surface-800 border border-state-running rounded">
      <strong class="block mb-1 text-sm">Copy this key now — it will not be shown again.</strong>
      <pre class="select-all text-xs font-mono break-all bg-surface-900 p-2 rounded">{form.createdKey.key}</pre>
    </div>
  {/if}

  {#if form?.error}
    <p class="text-sm text-state-failed mb-4">{form.error}</p>
  {/if}

  <form method="POST" action="?/create" class="flex flex-wrap items-end gap-2 mb-8">
    <label class="flex flex-col gap-1 text-xs text-surface-300 flex-1 min-w-[160px]">
      Name
      <Input name="name" placeholder="prod-ci" required />
    </label>

    <label class="flex flex-col gap-1 text-xs text-surface-300">
      Expires (optional)
      <Input name="expiresAt" type="date" />
    </label>

    <Button type="submit" variant="primary">Create key</Button>
  </form>

  {#if data.keys.length === 0}
    <p class="text-sm text-surface-400">No API keys yet.</p>
  {:else}
    <ul class="divide-y divide-surface-700 text-sm border border-surface-700 rounded">
      {#each data.keys as k (k.id)}
        <li class="py-3 px-4 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium truncate">{k.name}</span>
              {#if !k.enabled}<Badge variant="failed">revoked</Badge>{/if}
              {#if k.enabled && k.expiresAt && k.expiresAt.getTime() < Date.now()}
                <Badge variant="failed">expired</Badge>
              {/if}
            </div>
            <div class="text-xs text-surface-400 mt-0.5">
              {k.start ?? '—'} · created {k.createdAt.toLocaleDateString()}
              {#if k.lastRequest} · last used {k.lastRequest.toLocaleString()}{/if}
              {#if k.expiresAt} · expires {k.expiresAt.toLocaleDateString()}{/if}
            </div>
          </div>

          {#if k.enabled}
            <form method="POST" action="?/revoke">
              <input type="hidden" name="id" value={k.id} />
              <Button type="submit" variant="danger" size="sm">Revoke</Button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
