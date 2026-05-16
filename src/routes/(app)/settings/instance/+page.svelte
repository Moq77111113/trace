<script lang="ts">
	import { enhance } from '$app/forms';
	import Button    from '$lib/shared/ui/Button.svelte';
	import Input     from '$lib/shared/ui/Input.svelte';
	import Pill      from '$lib/shared/ui/Pill.svelte';
	import PageTitle from '$lib/shared/ui/PageTitle.svelte';
	import { plural } from '$lib/shared/i18n/plural';
	import * as m    from '$lib/paraglide/messages';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type SignupState = { signupBudget: number; signupWindowEndsAt: Date | string | null };
	function describeState(s: SignupState): { label: string; kind: 'neutral' | 'brand' } {
		if (s.signupBudget <= 0) return { label: m.instance_signup_closed(), kind: 'neutral' };
		const seats = plural(s.signupBudget, m.instance_signup_seats_one, m.instance_signup_seats_other);
		if (s.signupWindowEndsAt) {
			const when = new Date(s.signupWindowEndsAt).toLocaleString();
			return { label: m.instance_signup_seats_until({ seats, when }), kind: 'brand' };
		}
		return { label: seats, kind: 'brand' };
	}

	const state = $derived(describeState(data.settings));
	const error = $derived(form && 'error' in form ? form.error : null);
</script>

<PageTitle title={m.page_title_settings_instance()} />

<div class="flex flex-col gap-8">
	<section id="signup">
		<h1 class="text-[20px] font-semibold tracking-tight">{m.page_title_settings_instance()}</h1>
		<h2 class="text-[15px] font-semibold tracking-tight mt-5 mb-1">{m.instance_signup_title()}</h2>
		<p class="text-[13px] text-ink-3 max-w-[64ch] mb-4">
			{m.instance_signup_body()}
		</p>

		<div class="flex items-center gap-2 mb-5">
			<Pill kind={state.kind}>{state.label}</Pill>
		</div>

		{#if error}
			<p class="text-[12px] text-fail-ink mb-3">{error}</p>
		{/if}

		<form method="POST" action="?/open" use:enhance class="flex flex-wrap items-end gap-2 mb-3">
			<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
				{m.instance_signup_seats_field()}
				<Input name="budget" type="number" min="1" value="1" required class="w-24" />
			</label>
			<label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
				{m.instance_signup_closes_field()}
				<Input name="windowEndsAt" type="datetime-local" />
			</label>
			<Button type="submit" variant="primary">{m.instance_signup_open_cta()}</Button>
		</form>

		{#if data.settings.signupBudget > 0}
			<form method="POST" action="?/close" use:enhance>
				<Button type="submit" variant="secondary" size="sm">{m.instance_signup_close_cta()}</Button>
			</form>
		{/if}
	</section>

	<section id="demo">
		<h2 class="text-[15px] font-semibold tracking-tight mb-1">{m.instance_demo_title()}</h2>
		<p class="text-[13px] text-ink-3 max-w-[64ch] mb-4">
			{m.instance_demo_body()}
		</p>

		{#if data.demoExists}
			<Pill kind="brand">{m.instance_demo_present()}</Pill>
		{:else}
			<div class="flex items-center gap-3">
				<Pill kind="neutral">{m.instance_demo_missing()}</Pill>
				<form method="POST" action="?/reseed" use:enhance>
					<Button type="submit" variant="secondary" size="sm">{m.instance_demo_reseed()}</Button>
				</form>
			</div>
		{/if}
	</section>

	<section id="users">
		<h2 class="text-[15px] font-semibold tracking-tight mb-1">{m.instance_users_title()}</h2>
		<p class="text-[13px] text-ink-3 max-w-[64ch] mb-4">
			{m.instance_users_body()}
		</p>

		<ul class="flex flex-col gap-1.5">
			{#each data.users as u (u.id)}
				<li class="flex items-center gap-3 px-3 py-2 rounded-md bg-surface text-[13px]">
					<span class="font-medium text-ink truncate flex-1">{u.email}</span>
					{#if u.name}<span class="text-ink-3 text-[12px] truncate">{u.name}</span>{/if}
					<Pill kind={u.role === 'admin' ? 'brand' : 'neutral'}>{u.role}</Pill>
					<span class="text-ink-3 text-[11px] whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</span>
				</li>
			{/each}
		</ul>
	</section>
</div>
