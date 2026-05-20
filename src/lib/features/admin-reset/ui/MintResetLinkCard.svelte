<script lang="ts">
  import Button         from '$lib/shared/ui/Button.svelte';
  import MintedLinkRow  from './MintedLinkRow.svelte';
  import * as m         from '$lib/paraglide/messages';

  type UserOption = { id: string; email: string };
  type RecentRow  = { id: string; targetEmail: string; mintedAt: Date | string; usedAt: Date | string | null; expiresAt: Date | string };
  type Props = {
    users: UserOption[];
    recent: RecentRow[];
    ttlMinutes: number;
    mintedUrl?: string | null;
    mintedExpiresAt?: Date | string | null;
    error?: string | null;
  };
  let { users, recent, ttlMinutes, mintedUrl = null, mintedExpiresAt = null, error = null }: Props = $props();

  let copied = $state(false);
  async function copy() {
    if (!mintedUrl) return;
    await navigator.clipboard.writeText(mintedUrl);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<section class="bg-surface border border-border rounded-xl p-5">
  <h2 class="text-[14px] font-semibold tracking-tight mb-1">{m.instance_admin_reset_title()}</h2>
  <p class="text-[12px] text-ink-3 mb-4">{m.instance_admin_reset_body()}</p>

  <form method="POST" action="?/mintResetLink" class="flex flex-wrap items-end gap-2 mb-4">
    <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
      {m.instance_admin_reset_user()}
      <select
        name="targetUserId"
        required
        class="h-[30px] px-2.5 text-[12.5px] rounded-md bg-surface text-ink border border-border hover:border-border-strong focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:border-accent min-w-[180px]"
      >
        {#each users as u (u.id)}
          <option value={u.id}>{u.email}</option>
        {/each}
      </select>
    </label>
    <Button type="submit" variant="primary">{m.instance_admin_reset_generate()}</Button>
  </form>

  {#if error}
    <p class="text-[12px] text-fail-ink mb-3">{error}</p>
  {/if}

  {#if mintedUrl}
    <div class="border border-border rounded-md p-3 mb-4 bg-surface-2">
      <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-1">{m.instance_admin_reset_url_label({ ttl: ttlMinutes })}</div>
      <div class="font-mono text-[12px] break-all text-ink mb-2">{mintedUrl}</div>
      {#if mintedExpiresAt}
        <div class="text-[11px] text-ink-3 mb-2">
          {new Date(mintedExpiresAt).toLocaleString()}
        </div>
      {/if}
      <Button type="button" variant="secondary" size="sm" onclick={copy}>
        {copied ? m.instance_admin_reset_copied() : m.instance_admin_reset_copy()}
      </Button>
    </div>
  {/if}

  {#if recent.length > 0}
    <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2">{m.instance_admin_reset_recent()}</div>
    <ul class="flex flex-col gap-1.5">
      {#each recent as r (r.id)}
        <MintedLinkRow email={r.targetEmail} mintedAt={r.mintedAt} usedAt={r.usedAt} expiresAt={r.expiresAt} />
      {/each}
    </ul>
  {/if}
</section>
