<script lang="ts">
	import PageTitle           from '$lib/shared/ui/PageTitle.svelte';
	import ProfileCard         from '$lib/features/account/ui/ProfileCard.svelte';
	import AppearanceCard      from '$lib/features/account/ui/AppearanceCard.svelte';
	import LanguageCard        from '$lib/features/account/ui/LanguageCard.svelte';
	import ChangePasswordCard  from '$lib/features/account/ui/ChangePasswordCard.svelte';
	import SessionCard         from '$lib/features/account/ui/SessionCard.svelte';
	import * as m              from '$lib/paraglide/messages';

	let { data } = $props();
</script>

<PageTitle title={m.page_title_account()} />

<section class="max-w-2xl">
	<header class="mb-6">
		<h1 class="text-[20px] font-semibold tracking-tight">{m.page_title_account()}</h1>
		<p class="text-[13px] text-ink-3 mt-1">{m.account_subtitle()}</p>
	</header>

	<ProfileCard name={data.user.name} email={data.user.email} />
	<AppearanceCard initialTheme={data.theme} initialAccent={data.accent} />
	<LanguageCard />
	<ChangePasswordCard oidcProvider={data.oidcProvider} minLength={data.passwordMinLength} />
	<SessionCard email={data.user.email} />
</section>
