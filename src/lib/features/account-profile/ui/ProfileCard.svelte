<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	type Props = { name: string | null; email: string };
	let { name, email }: Props = $props();

	function initials(): string {
		const src = name?.trim() || email.split('@')[0] || '?';
		return src
			.split(/[\s._-]+/)
			.slice(0, 2)
			.map((s) => s[0]?.toUpperCase() ?? '')
			.join('') || '?';
	}
</script>

<section class="bg-surface border border-border rounded-xl p-5 mb-4">
	<h2 class="text-[14px] font-semibold tracking-tight mb-3">{m.account_profile()}</h2>
	<div class="flex items-center gap-3">
		<span class="w-10 h-10 rounded-full bg-surface-2 border border-border grid place-items-center text-ink-2 text-[13px] font-semibold shrink-0">
			{initials()}
		</span>
		<div class="min-w-0 flex-1">
			<div class="text-[14px] font-medium">{name ?? email.split('@')[0]}</div>
			<div class="text-[12px] text-ink-3 font-mono">{email}</div>
		</div>
	</div>
</section>
