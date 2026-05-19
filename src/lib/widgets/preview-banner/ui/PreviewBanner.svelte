<script lang="ts">
	import { onMount } from 'svelte';
	import Icon       from '$lib/shared/ui/Icon.svelte';
	import * as m     from '$lib/paraglide/messages';

	const DISMISS_KEY = 'trace.preview-banner.dismissed';
	const ISSUES_URL  = 'https://github.com/Moq77111113/trace/issues/new';
	const ROADMAP_URL = '/roadmap';

	let visible = $state(false);

	onMount(() => {
		try {
			if (sessionStorage.getItem(DISMISS_KEY) !== '1') visible = true;
		} catch {
			visible = true;
		}
	});

	function dismiss() {
		visible = false;
		try {
			sessionStorage.setItem(DISMISS_KEY, '1');
		} catch {
			/* sessionStorage unavailable, dismiss is session-scoped anyway */
		}
	}
</script>

{#if visible}
	<div
		role="status"
		class="flex items-center gap-3 px-4 py-2 border-b border-accent/30 bg-accent-soft text-accent-soft-ink text-[12.5px]"
	>
		<span class="inline-flex items-center gap-1.5 shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-md bg-accent/15 border border-accent/30">
			<span class="size-1.5 rounded-full bg-accent" aria-hidden="true"></span>
			{m.banner_prealpha_label()}
		</span>

		<span class="flex-1 min-w-0 truncate">{m.banner_prealpha_message()}</span>

		<a
			href={ROADMAP_URL}
			class="hidden sm:inline-flex items-center gap-1 hover:underline underline-offset-2"
		>
			<Icon name="Map" size={12} />
			<span>{m.banner_see_roadmap()}</span>
		</a>

		<a
			href={ISSUES_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="hidden sm:inline-flex items-center gap-1 hover:underline underline-offset-2"
		>
			<Icon name="LifeBuoy" size={12} />
			<span>{m.banner_report_issue()}</span>
		</a>

		<button
			type="button"
			onclick={dismiss}
			aria-label={m.banner_dismiss()}
			title={m.banner_dismiss()}
			class="ml-1 grid place-items-center w-[22px] h-[22px] rounded-md cursor-pointer hover:bg-accent/15"
		>
			<Icon name="X" size={13} />
		</button>
	</div>
{/if}
