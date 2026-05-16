<script lang="ts">
	import { untrack } from 'svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import Button    from '$lib/components/ui/Button.svelte';
	import Input     from '$lib/components/ui/Input.svelte';
	import * as m    from '$lib/paraglide/messages';

	let { data, form } = $props();

	const bootstrap   = $derived(!data.adminExists);
	const canSignup   = $derived(bootstrap || data.signupOpen);

	let mode = $state<'signin' | 'signup'>(
		untrack(() => (form?.mode ?? (data.adminExists ? 'signin' : 'signup'))),
	);
	$effect(() => {
		if (!canSignup && mode === 'signup') mode = 'signin';
	});

	const title = $derived(
		bootstrap
			? m.login_bootstrap_title()
			: mode === 'signin'
				? m.login_signin_title()
				: m.login_signup_title(),
	);
	const subtitle = $derived(
		bootstrap
			? m.login_bootstrap_subtitle()
			: mode === 'signin'
				? m.login_signin_subtitle()
				: m.login_signup_subtitle(),
	);
	const cta         = $derived(mode === 'signin' ? m.login_signin_cta() : m.login_signup_cta());
	const toggleLabel = $derived(
		mode === 'signin' ? m.login_toggle_to_signup() : m.login_toggle_to_signin(),
	);
	const pageTitle   = $derived(
		bootstrap
			? m.page_title_bootstrap()
			: mode === 'signin'
				? m.page_title_signin()
				: m.page_title_signup(),
	);
</script>

<PageTitle title={pageTitle} />

<section class="min-h-screen flex items-center justify-center bg-canvas px-4">
	<div class="w-full max-w-sm bg-surface border border-border rounded-xl p-6 shadow-[var(--shadow-2)]">
		<div class="flex items-center gap-2 mb-4">
			<span class="w-[22px] h-[22px] rounded-md bg-accent text-accent-fg grid place-items-center shrink-0">
				<BrandMark size={18} />
			</span>
			<span class="font-semibold tracking-[-0.01em] text-[14px]">Trace</span>
		</div>

		<h1 class="text-[18px] font-semibold tracking-tight mb-1">{title}</h1>
		<p class="text-[13px] text-ink-3 mb-5">{subtitle}</p>

		<form method="POST" action={mode === 'signin' ? '?/signin' : '?/signup'} class="flex flex-col gap-3">
			{#if mode === 'signup'}
				<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
					{m.login_name()}
					<Input name="name" type="text" autocomplete="name" required value={form?.name ?? ''} />
				</label>
			{/if}

			<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
				{m.login_email()}
				<Input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
			</label>

			<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
				{m.login_password()}
				<Input
					name="password"
					type="password"
					autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
					required
				/>
			</label>

			{#if form?.error}
				<p class="text-[12px] text-fail-ink">{form.error}</p>
			{/if}

			<Button type="submit" variant="primary">{cta}</Button>
		</form>

		{#if canSignup && !bootstrap}
			<button
				type="button"
				class="mt-3 text-[12px] text-ink-3 hover:text-ink underline-offset-2 hover:underline bg-transparent border-0 cursor-pointer"
				onclick={() => (mode = mode === 'signin' ? 'signup' : 'signin')}
			>
				{toggleLabel}
			</button>
		{:else if !canSignup}
			<p class="mt-3 text-[12px] text-ink-mute">
				{m.login_closed_notice()}
			</p>
		{/if}

		{#if data.oidcEnabled && mode === 'signin'}
			<div class="flex items-center gap-2 my-5 text-[10px] uppercase tracking-[0.08em] text-ink-mute">
				<span class="flex-1 h-px bg-border"></span>
				<span>{m.login_or()}</span>
				<span class="flex-1 h-px bg-border"></span>
			</div>

			<form method="POST" action="?/oidc">
				<Button type="submit" variant="secondary" class="w-full">{m.login_oidc_cta()}</Button>
			</form>
		{/if}
	</div>
</section>
