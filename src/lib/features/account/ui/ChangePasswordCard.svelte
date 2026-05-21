<script lang="ts">
	import Button from '$lib/shared/ui/Button.svelte';
	import Input  from '$lib/shared/ui/Input.svelte';
	import * as m from '$lib/paraglide/messages';
	import { ChangePasswordController } from '../model/change-password.svelte';

	type Props = { oidcProvider?: string | null; minLength: number };
	let { oidcProvider = null, minLength }: Props = $props();
	const disabled = $derived(Boolean(oidcProvider));

	const ctl = new ChangePasswordController();
</script>

<section class="bg-surface border border-border rounded-xl p-5 mb-4">
	<h2 class="text-[14px] font-semibold tracking-tight mb-3">{m.change_password_title()}</h2>

	{#if disabled}
		<p class="text-[13px] text-ink-3">
			{m.change_password_oidc_only({ provider: oidcProvider ?? 'SSO' })}
		</p>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); ctl.submit(); }} class="flex flex-col gap-3 max-w-sm">
			<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
				{m.change_password_current()}
				<Input bind:value={ctl.current} type="password" autocomplete="current-password" required />
			</label>

			<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
				{m.change_password_new()}
				<Input bind:value={ctl.next} type="password" autocomplete="new-password" minlength={minLength} required />
			</label>

			<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
				{m.change_password_confirm()}
				<Input bind:value={ctl.confirm} type="password" autocomplete="new-password" minlength={minLength} required />
			</label>

			{#if ctl.error}<p class="text-[12px] text-fail-ink">{ctl.error}</p>{/if}
			{#if ctl.success}<p class="text-[12px] text-pass-ink">{m.change_password_success()}</p>{/if}

			<Button type="submit" variant="primary" disabled={ctl.pending}>
				{m.change_password_submit()}
			</Button>
		</form>
	{/if}
</section>
