<script lang="ts">
	import { untrack } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input  from '$lib/components/ui/Input.svelte';

	let { data, form } = $props();

	let mode = $state<'signin' | 'signup'>(untrack(() => form?.mode ?? 'signin'));

	const title       = $derived(mode === 'signin' ? 'Sign in to Trace' : 'Create your account');
	const cta         = $derived(mode === 'signin' ? 'Sign in' : 'Create account');
	const toggleLabel = $derived(
		mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'
	);
</script>

<section class="min-h-screen flex items-center justify-center bg-canvas px-4">
	<div class="w-full max-w-sm bg-surface border border-border rounded-xl p-6 shadow-[var(--shadow-2)]">
		<div class="flex items-center gap-2 mb-4">
			<span class="w-[22px] h-[22px] rounded-md bg-accent text-accent-fg grid place-items-center shrink-0">
				<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M4 3v10M4 3l5 5-5 5M11 8h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</span>
			<span class="font-semibold tracking-[-0.01em] text-[14px]">Trace</span>
		</div>

		<h1 class="text-[18px] font-semibold tracking-tight mb-1">{title}</h1>
		<p class="text-[13px] text-ink-3 mb-5">
			{mode === 'signin' ? 'Welcome back.' : 'Sign up with email and password.'}
		</p>

		<form method="POST" action={mode === 'signin' ? '?/signin' : '?/signup'} class="flex flex-col gap-3">
			{#if mode === 'signup'}
				<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
					Name
					<Input name="name" type="text" autocomplete="name" required value={form?.name ?? ''} />
				</label>
			{/if}

			<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
				Email
				<Input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
			</label>

			<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
				Password
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

		<button
			type="button"
			class="mt-3 text-[12px] text-ink-3 hover:text-ink underline-offset-2 hover:underline bg-transparent border-0 cursor-pointer"
			onclick={() => (mode = mode === 'signin' ? 'signup' : 'signin')}
		>
			{toggleLabel}
		</button>

		{#if data.oidcEnabled && mode === 'signin'}
			<div class="flex items-center gap-2 my-5 text-[10px] uppercase tracking-[0.08em] text-ink-mute">
				<span class="flex-1 h-px bg-border"></span>
				<span>or</span>
				<span class="flex-1 h-px bg-border"></span>
			</div>

			<form method="POST" action="?/oidc">
				<Button type="submit" variant="secondary" class="w-full">Continue with SSO</Button>
			</form>
		{/if}
	</div>
</section>
