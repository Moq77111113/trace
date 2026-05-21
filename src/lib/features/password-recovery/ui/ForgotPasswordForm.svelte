<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/shared/ui/Button.svelte';
	import Input  from '$lib/shared/ui/Input.svelte';
	import * as m from '$lib/paraglide/messages';

	type Props = { done?: boolean; email?: string };
	let { done = false, email = '' }: Props = $props();

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
	{#if done}
		<p class="text-[13px] text-ink-2">{m.forgot_password_done()}</p>
	{:else}
		<p class="text-[13px] text-ink-3">{m.forgot_password_subtitle()}</p>

		<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
			{m.forgot_password_email()}
			<Input name="email" type="email" autocomplete="email" required value={email} />
		</label>

		<Button type="submit" variant="primary" disabled={pending}>{m.forgot_password_submit()}</Button>
	{/if}
</form>
