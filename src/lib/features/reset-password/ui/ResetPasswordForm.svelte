<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/shared/ui/Button.svelte';
	import Input  from '$lib/shared/ui/Input.svelte';
	import * as m from '$lib/paraglide/messages';
	import { PASSWORD_MIN_LENGTH, PASSWORD_RESET_TTL_MIN } from '$lib/shared/auth/constants';

	type Props = { error?: string | null };
	let { error = null }: Props = $props();

	let pending = $state(false);
</script>

<form
	method="POST"
	class="flex flex-col gap-3"
	use:enhance={() => {
		pending = true;
		return async ({ update }) => {
			await update();
			pending = false;
		};
	}}
>
	<p class="text-[13px] text-ink-3">{m.reset_password_subtitle({ ttl: PASSWORD_RESET_TTL_MIN })}</p>

	<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
		{m.reset_password_new()}
		<Input name="newPassword" type="password" autocomplete="new-password" minlength={PASSWORD_MIN_LENGTH} required />
	</label>

	<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
		{m.reset_password_confirm()}
		<Input name="confirmPassword" type="password" autocomplete="new-password" minlength={PASSWORD_MIN_LENGTH} required />
	</label>

	{#if error}
		<p class="text-[12px] text-fail-ink">{error}</p>
	{/if}

	<Button type="submit" variant="primary" disabled={pending}>{m.reset_password_submit()}</Button>
</form>
