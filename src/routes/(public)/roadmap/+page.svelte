<script lang="ts">
	import { slide }   from 'svelte/transition';
	import BrandMark   from '$lib/shared/brand/BrandMark.svelte';
	import Icon        from '$lib/shared/ui/Icon.svelte';
	import PageTitle   from '$lib/shared/ui/PageTitle.svelte';
	import * as m      from '$lib/paraglide/messages';

	type Status = 'shipped' | 'in-progress' | 'next' | 'later';

	let { data } = $props();

	const STATUS_LABEL: Record<Status, () => string> = {
		'in-progress': m.roadmap_status_in_progress,
		'next':        m.roadmap_status_next,
		'later':       m.roadmap_status_later,
		'shipped':     m.roadmap_status_shipped,
	};

	const STATUS_TONE: Record<Status, { dot: string; rail: string; pulse: boolean }> = {
		'in-progress': { dot: 'bg-run',     rail: 'bg-run/40',     pulse: true  },
		'next':        { dot: 'bg-accent',  rail: 'bg-accent/40',  pulse: false },
		'later':       { dot: 'bg-pending', rail: 'bg-pending/40', pulse: false },
		'shipped':     { dot: 'bg-pass',    rail: 'bg-pass/40',    pulse: false },
	};

	const COLLAPSIBLE_DEFAULT_CLOSED: Status[] = ['shipped'];

	let openMap = $state<Record<Status, boolean>>({
		'in-progress': true,
		'next':        true,
		'later':       true,
		'shipped':     !COLLAPSIBLE_DEFAULT_CLOSED.includes('shipped'),
	});

	function toggle(status: Status) {
		openMap[status] = !openMap[status];
	}
</script>

<PageTitle title={m.page_title_roadmap()} />

<main class="relative min-h-screen bg-canvas px-6 py-12 sm:py-16 overflow-hidden">
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-0
		       bg-[radial-gradient(60%_60%_at_50%_0%,var(--accent-ring)_0%,transparent_70%)]"
		aria-hidden="true"
	></div>

	<div class="relative mx-auto max-w-3xl">

		<header class="flex flex-col gap-5 mb-14">
			<a
				href="/"
				class="inline-flex items-center gap-2 self-start text-[12px] text-ink-3 hover:text-ink transition-colors"
			>
				<span class="w-[22px] h-[22px] rounded-md bg-accent text-accent-fg grid place-items-center">
					<BrandMark size={16} />
				</span>
				<span class="font-semibold tracking-[-0.01em] text-[13px] text-ink">Trace</span>
				<span class="text-ink-mute">·</span>
				<span class="text-ink-3">{m.roadmap_back()}</span>
			</a>

			<div class="flex flex-col gap-3">
				<span class="inline-flex items-center gap-2 self-start font-mono text-[11px] uppercase tracking-[0.08em] text-accent-soft-ink">
					<span class="size-1.5 rounded-full bg-accent animate-[runpulse_2.4s_ease-in-out_infinite]" aria-hidden="true"></span>
					Live roadmap
				</span>
				<h1 class="text-4xl sm:text-5xl font-semibold tracking-tight text-ink leading-[1.05]">
					{m.roadmap_heading()}
				</h1>
				<p class="text-ink-2 text-[15px] leading-relaxed max-w-[55ch]">
					{m.roadmap_subtitle()}
				</p>
			</div>

			<p class="text-[12.5px] text-ink-3 leading-relaxed border-l-2 border-accent/30 pl-3 italic">
				{m.roadmap_disclaimer()}
			</p>
		</header>

		<div class="flex flex-col gap-10">
			{#each data.groups as group, gi (group.status)}
				{@const status      = group.status as Status}
				{@const tone        = STATUS_TONE[status]}
				{@const collapsible = COLLAPSIBLE_DEFAULT_CLOSED.includes(status)}
				{@const open        = openMap[status]}
				<section
					class="relative flex flex-col gap-4 rounded-xl pl-4 py-3 -ml-4 transition-colors"
					style="animation: fadein 360ms ease-out backwards; animation-delay: {gi * 60}ms;"
				>
					<span class={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full ${tone.rail}`} aria-hidden="true"></span>

					{#if collapsible}
						<button
							type="button"
							onclick={() => toggle(status)}
							aria-expanded={open}
							class="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.04em] uppercase text-ink
							       cursor-pointer bg-transparent border-0 p-0 self-start
							       hover:text-ink"
						>
							<span
								class={[
									'size-2 rounded-full',
									tone.dot,
									tone.pulse ? 'animate-[runpulse_2s_ease-in-out_infinite]' : '',
								].join(' ')}
								aria-hidden="true"
							></span>
							{STATUS_LABEL[status]()}
							<span class="font-mono text-[11px] font-normal text-ink-3 normal-case">
								({group.items.length})
							</span>
							<span
								class="ml-1 text-ink-3 transition-transform duration-200"
								style={open ? 'transform: rotate(90deg);' : ''}
								aria-hidden="true"
							>
								<Icon name="ChevronRight" size={12} />
							</span>
						</button>
					{:else}
						<h2 class="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.04em] uppercase text-ink">
							<span
								class={[
									'size-2 rounded-full',
									tone.dot,
									tone.pulse ? 'animate-[runpulse_2s_ease-in-out_infinite]' : '',
								].join(' ')}
								aria-hidden="true"
							></span>
							{STATUS_LABEL[status]()}
							<span class="font-mono text-[11px] font-normal text-ink-3 normal-case">
								({group.items.length})
							</span>
						</h2>
					{/if}

					{#if !collapsible || open}
						<ul
							class="flex flex-col gap-2.5"
							transition:slide={{ duration: 220 }}
						>
							{#each group.items as item (item.id)}
								<li
									class="group rounded-lg border border-border bg-surface px-4 py-3
									       hover:border-accent/40 hover:shadow-[var(--shadow-1)]
									       transition-[border-color,box-shadow,transform] duration-150
									       hover:-translate-y-px"
								>
									<h3 class="text-[14.5px] font-medium text-ink tracking-tight">{item.title}</h3>
									<p class="mt-1 text-[13px] text-ink-2 leading-relaxed">{item.summary}</p>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/each}
		</div>

		<section class="mt-16 flex flex-col gap-3">
			<span class="inline-flex items-center gap-2 self-start font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
				<span class="size-1.5 rounded-full bg-fail/70" aria-hidden="true"></span>
				{m.roadmap_scope_eyebrow()}
			</span>
			<p class="text-[14px] text-ink-2 leading-relaxed">{m.roadmap_scope_intro()}</p>
			<ul class="grid gap-2 sm:grid-cols-2">
				{#each [m.roadmap_scope_item_tracker(), m.roadmap_scope_item_runner(), m.roadmap_scope_item_ai(), m.roadmap_scope_item_workflow()] as label, i (i)}
					<li class="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-2.5">
						<span class="mt-0.5 grid size-4 place-items-center rounded-full bg-fail-soft text-fail-ink shrink-0">
							<Icon name="X" size={10} />
						</span>
						<span class="text-[13px] text-ink-2 leading-snug">{label}</span>
					</li>
				{/each}
			</ul>
			<p class="text-[13px] text-ink-3 italic mt-1">{m.roadmap_scope_outro()}</p>
		</section>

		<section class="mt-6 rounded-xl border border-dashed border-accent/30 bg-accent-soft/30 px-5 py-5 flex items-center justify-between gap-5 flex-wrap">
			<div class="flex flex-col gap-1 min-w-0">
				<h3 class="text-[15px] font-semibold tracking-tight text-ink">{m.roadmap_suggest_title()}</h3>
				<p class="text-[13px] text-ink-2 leading-relaxed max-w-[44ch]">{m.roadmap_suggest_body()}</p>
			</div>
			<a
				href="https://github.com/Moq77111113/trace/issues/new?labels=enhancement&title=Suggestion%3A%20"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-md bg-accent text-accent-fg px-4 py-2 text-[13px] font-medium
				       hover:bg-accent-hover transition-colors shadow-[var(--shadow-1)]"
			>
				<Icon name="Plus" size={13} />
				<span>{m.roadmap_suggest_cta()}</span>
				<Icon name="ArrowRight" size={13} />
			</a>
		</section>

		<footer class="mt-12 pt-6 border-t border-border flex items-center justify-between text-[12px] text-ink-3 font-mono">
			<span>{m.roadmap_stamp({ date: data.stamp })}</span>
			<a
				href="/roadmap.json"
				class="hover:text-ink underline-offset-2 hover:underline transition-colors"
			>
				/roadmap.json
			</a>
		</footer>
	</div>
</main>

<style>
	@keyframes fadein {
		from { opacity: 0; transform: translateY(6px); }
		to   { opacity: 1; transform: translateY(0); }
	}
</style>
