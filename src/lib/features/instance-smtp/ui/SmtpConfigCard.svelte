<script lang="ts">
  import Button         from '$lib/shared/ui/Button.svelte';
  import Input          from '$lib/shared/ui/Input.svelte';
  import Checkbox       from '$lib/shared/ui/Checkbox.svelte';
  import SmtpStatusPill from './SmtpStatusPill.svelte';
  import * as m         from '$lib/paraglide/messages';

  type Props = {
    configured:  boolean;
    testedAt?:   Date | string | null;
    initial: {
      host: string; port: number; user: string; from: string; secure: boolean;
    };
    form?: { error?: string | null; testOk?: { messageId: string } | null; testFail?: string | null } | null;
  };
  let { configured, testedAt = null, initial, form = null }: Props = $props();

  // Initialized from props once: form defaults that the user then controls independently.
  let secure         = $state(false);
  let changePassword = $state(true);
  $effect.pre(() => {
    secure         = initial.secure;
    changePassword = !configured;
  });

  const error    = $derived(form?.error ?? null);
  const testOk   = $derived(form?.testOk ?? null);
  const testFail = $derived(form?.testFail ?? null);
</script>

<section class="bg-surface border border-border rounded-xl p-5">
  <h2 class="text-[14px] font-semibold tracking-tight mb-1">{m.instance_smtp_title()}</h2>
  <p class="text-[12px] text-ink-3 mb-3">{m.instance_smtp_body()}</p>

  <div class="mb-4">
    <SmtpStatusPill {configured} {testedAt} />
  </div>

  <form method="POST" action="?/saveSmtp" class="flex flex-col gap-3 max-w-md">
    <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
      {m.instance_smtp_host()}
      <Input name="host" type="text" value={initial.host} required />
    </label>

    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
        {m.instance_smtp_port()}
        <Input name="port" type="number" min="1" max="65535" value={String(initial.port)} required />
      </label>
      <div class="flex items-center gap-2 mt-5 text-[12px]">
        <Checkbox checked={secure} onCheckedChange={(v) => (secure = v)} />
        <input type="hidden" name="secure" value={secure ? 'on' : ''} />
        <span>{m.instance_smtp_secure_tls()}</span>
      </div>
    </div>

    <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
      {m.instance_smtp_username()}
      <Input name="user" type="text" value={initial.user} />
    </label>

    <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
      <span class="flex items-center justify-between">
        {m.instance_smtp_password()}
        {#if configured}
          <span class="text-[10px] flex items-center gap-1 normal-case tracking-normal">
            <Checkbox checked={changePassword} onCheckedChange={(v) => (changePassword = v)} />
            <input type="hidden" name="changePassword" value={changePassword ? 'on' : ''} />
            {m.instance_smtp_password_change()}
          </span>
        {/if}
      </span>
      <Input name="password" type="password" autocomplete="new-password" disabled={!changePassword} />
    </label>

    <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
      {m.instance_smtp_from()}
      <Input name="from" type="text" value={initial.from} required />
    </label>

    {#if error}<p class="text-[12px] text-fail-ink">{error}</p>{/if}
    {#if testOk}<p class="text-[12px] text-pass-ink">{m.instance_smtp_test_ok({ messageId: testOk.messageId })}</p>{/if}
    {#if testFail}<p class="text-[12px] text-fail-ink">{m.instance_smtp_test_fail({ reason: testFail })}</p>{/if}

    <div class="flex items-center gap-2">
      <Button type="submit" variant="primary">{m.instance_smtp_save()}</Button>
      <Button type="submit" variant="secondary" formaction="?/sendTestEmail">{m.instance_smtp_test()}</Button>
    </div>
  </form>
</section>
