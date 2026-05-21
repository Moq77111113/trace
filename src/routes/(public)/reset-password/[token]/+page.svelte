<script lang="ts">
	import BrandMark         from '$lib/shared/brand/BrandMark.svelte';
	import PageTitle         from '$lib/shared/ui/PageTitle.svelte';
	import ResetPasswordForm from '$lib/features/password-recovery/ui/ResetPasswordForm.svelte';
	import * as m            from '$lib/paraglide/messages';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	const error = $derived(form && 'error' in form ? form.error : null);
</script>

<PageTitle title={m.page_title_reset_password()} />

<section class="min-h-screen flex items-center justify-center bg-canvas px-4">
	<div class="w-full max-w-sm bg-surface border border-border rounded-xl p-6 shadow-[var(--shadow-2)]">
		<div class="flex items-center gap-2 mb-4">
			<span class="w-[22px] h-[22px] rounded-md bg-accent text-accent-fg grid place-items-center shrink-0">
				<BrandMark size={18} />
			</span>
			<span class="font-semibold tracking-[-0.01em] text-[14px]">Trace</span>
		</div>

		<h1 class="text-[18px] font-semibold tracking-tight mb-1">{m.page_title_reset_password()}</h1>

		<ResetPasswordForm {error} />
	</div>
</section>
