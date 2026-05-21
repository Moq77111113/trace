<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from '$lib/shared/ui/Icon.svelte';
	import { applyTheme, applyAccent } from '$lib/shared/lib/theme.client';
	import { ACCENTS, type Accent, type Theme } from '$lib/shared/lib/theme';
	import * as m from '$lib/paraglide/messages';

	type Props = { initialTheme: Theme; initialAccent: Accent };
	let { initialTheme, initialAccent }: Props = $props();

	let theme  = $state<Theme>(untrack(() => initialTheme));
	let accent = $state<Accent>(untrack(() => initialAccent));

	function setTheme(t: Theme) {
		theme = t;
		applyTheme(t);
	}

	function setAccent(a: Accent) {
		accent = a;
		applyAccent(a);
	}

	const ACCENT_HEX: Record<Accent, string> = {
		pink:  'oklch(0.66 0.22 350)',
		amber: 'oklch(0.66 0.16 60)',
		cyan:  'oklch(0.66 0.13 210)',
		lime:  'oklch(0.68 0.18 130)'
	};
</script>

<section class="bg-surface border border-border rounded-xl p-5 mb-4">
	<h2 class="text-[14px] font-semibold tracking-tight mb-1">{m.account_appearance()}</h2>
	<p class="text-[12px] text-ink-3 mb-4">{m.account_appearance_body()}</p>

	<div class="mb-5">
		<div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium">{m.account_theme()}</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="flex items-center gap-2 h-[30px] px-3 text-[12.5px] rounded-md border cursor-pointer {theme === 'light' ? 'bg-surface text-ink border-border-strong' : 'bg-surface text-ink-2 border-border hover:border-border-strong'}"
				onclick={() => setTheme('light')}
				aria-pressed={theme === 'light'}
			>
				<Icon name="Sun" size={13} /> {m.account_theme_light()}
			</button>
			<button
				type="button"
				class="flex items-center gap-2 h-[30px] px-3 text-[12.5px] rounded-md border cursor-pointer {theme === 'dark' ? 'bg-surface text-ink border-border-strong' : 'bg-surface text-ink-2 border-border hover:border-border-strong'}"
				onclick={() => setTheme('dark')}
				aria-pressed={theme === 'dark'}
			>
				<Icon name="Moon" size={13} /> {m.account_theme_dark()}
			</button>
		</div>
	</div>

	<div>
		<div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium">{m.account_accent()}</div>
		<div class="flex items-center gap-2.5">
			{#each ACCENTS as a (a)}
				{@const active = accent === a}
				<button
					type="button"
					class="group flex flex-col items-center gap-1.5 cursor-pointer"
					onclick={() => setAccent(a)}
					aria-pressed={active}
					aria-label={`${m.account_accent()} ${a}`}
				>
					<span
						class="w-7 h-7 rounded-full border border-border transition-transform group-hover:scale-110 {active ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink-2' : ''}"
						style:background={ACCENT_HEX[a]}
					></span>
					<span class="text-[10.5px] uppercase tracking-[0.07em] text-ink-3 {active ? 'text-ink' : ''}">{a}</span>
				</button>
			{/each}
		</div>
	</div>
</section>
