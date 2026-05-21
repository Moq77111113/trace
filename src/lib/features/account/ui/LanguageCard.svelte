<script lang="ts">
	import { locales, getLocale, setLocale, type Locale } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	const currentLocale = $derived(getLocale());

	function chooseLocale(l: Locale) {
		if (l !== currentLocale) setLocale(l);
	}

	const LOCALE_LABEL: Record<Locale, string> = {
		en: 'English',
		fr: 'Français',
	};
</script>

<section class="bg-surface border border-border rounded-xl p-5 mb-4">
	<h2 class="text-[14px] font-semibold tracking-tight mb-1">{m.account_language()}</h2>
	<p class="text-[12px] text-ink-3 mb-4">{m.account_language_body()}</p>
	<div class="flex items-center gap-2">
		{#each locales as l (l)}
			{@const active = currentLocale === l}
			<button
				type="button"
				class="h-[30px] px-3 text-[12.5px] rounded-md border cursor-pointer {active ? 'bg-surface text-ink border-border-strong' : 'bg-surface text-ink-2 border-border hover:border-border-strong'}"
				onclick={() => chooseLocale(l)}
				aria-pressed={active}
			>
				{LOCALE_LABEL[l]}
			</button>
		{/each}
	</div>
</section>
