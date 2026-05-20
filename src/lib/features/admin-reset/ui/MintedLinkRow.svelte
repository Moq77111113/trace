<script lang="ts">
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import * as m from '$lib/paraglide/messages';

  type Status = 'used' | 'expired' | 'active';
  type Props = { email: string; mintedAt: Date | string; usedAt: Date | string | null; expiresAt: Date | string };
  let { email, mintedAt, usedAt, expiresAt }: Props = $props();

  const status = $derived<Status>(
    usedAt ? 'used' : new Date(expiresAt).getTime() < Date.now() ? 'expired' : 'active',
  );
  const label = $derived(
    status === 'used'    ? m.instance_admin_reset_row_used()
  : status === 'expired' ? m.instance_admin_reset_row_expired()
  :                        m.instance_admin_reset_row_active(),
  );
  const kind = $derived(status === 'used' ? 'pass' : status === 'expired' ? 'skip' : 'brand');
</script>

<li class="flex items-center gap-3 px-3 py-2 rounded-md bg-surface text-[13px]">
  <span class="font-medium text-ink truncate flex-1">{email}</span>
  <span class="text-ink-3 text-[11px] whitespace-nowrap">{new Date(mintedAt).toLocaleString()}</span>
  <Pill {kind}>{label}</Pill>
</li>
