<script lang="ts">
	import { untrack } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let { data, form } = $props();

	let mode = $state<'signin' | 'signup'>(untrack(() => form?.mode ?? 'signin'));

	const title = $derived(mode === 'signin' ? 'Sign in to Trace' : 'Create your account');
	const cta = $derived(mode === 'signin' ? 'Sign in' : 'Create account');
	const toggleLabel = $derived(
		mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'
	);
</script>

<section class="min-h-[60vh] flex items-center justify-center">
	<div class="w-full max-w-sm bg-surface-800 border border-surface-700 rounded-lg p-6">
		<h1 class="text-xl font-semibold mb-1">▶ {title}</h1>
		<p class="text-sm text-surface-400 mb-5">
			{mode === 'signin' ? 'Welcome back.' : 'Sign up with email and password.'}
		</p>

		<form method="POST" action={mode === 'signin' ? '?/signin' : '?/signup'} class="flex flex-col gap-3">
			{#if mode === 'signup'}
				<label class="flex flex-col gap-1 text-xs text-surface-300">
					Name
					<Input name="name" type="text" autocomplete="name" required value={form?.name ?? ''} />
				</label>
			{/if}

			<label class="flex flex-col gap-1 text-xs text-surface-300">
				Email
				<Input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
			</label>

			<label class="flex flex-col gap-1 text-xs text-surface-300">
				Password
				<Input
					name="password"
					type="password"
					autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
					required
				/>
			</label>

			{#if form?.error}
				<p class="text-xs text-state-failed">{form.error}</p>
			{/if}

			<Button type="submit" variant="primary">{cta}</Button>
		</form>

		<button
			type="button"
			class="mt-3 text-xs text-surface-400 hover:text-surface-200 underline"
			onclick={() => (mode = mode === 'signin' ? 'signup' : 'signin')}
		>
			{toggleLabel}
		</button>

		{#if data.oidcEnabled && mode === 'signin'}
			<div class="flex items-center gap-2 my-5 text-[10px] uppercase tracking-wider text-surface-500">
				<span class="flex-1 h-px bg-surface-700"></span>
				<span>or</span>
				<span class="flex-1 h-px bg-surface-700"></span>
			</div>

			<form method="POST" action="?/oidc">
				<Button type="submit" variant="secondary" class="w-full">Continue with SSO</Button>
			</form>
		{/if}
	</div>
</section>
