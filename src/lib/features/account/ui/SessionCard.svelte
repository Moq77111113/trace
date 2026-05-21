<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/shared/ui/Button.svelte';
	import { createAuthApi } from '$lib/shared/auth/client';
	import * as m from '$lib/paraglide/messages';

	type Props = { email: string };
	let { email }: Props = $props();

	const auth = createAuthApi();
	let signingOut = $state(false);

	async function signOut() {
		signingOut = true;
		await auth.signOut();
		await goto('/login');
	}
</script>

<section class="bg-surface border border-border rounded-xl p-5">
	<h2 class="text-[14px] font-semibold tracking-tight mb-1">{m.account_session()}</h2>
	<p class="text-[12px] text-ink-3 mb-4">{m.account_signed_in_as()} <code class="font-mono text-ink-2">{email}</code></p>
	<Button variant="danger" onclick={signOut} disabled={signingOut}>{m.account_sign_out()}</Button>
</section>
