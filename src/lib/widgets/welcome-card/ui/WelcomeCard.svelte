<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/shared/ui/Button.svelte';
	import Icon   from '$lib/shared/ui/Icon.svelte';

	type Props = {
		projectSlug: string;
		projectName: string;
		featureCode: string | null;
		ondismiss?:  () => void;
	};

	let { projectSlug, projectName, featureCode, ondismiss }: Props = $props();

	let dismissing = $state(false);
</script>

<section
	class="rounded-xl border border-accent/25 bg-accent-soft text-accent-soft-ink px-5 py-4 mb-6 flex items-start gap-4"
>
	<span class="shrink-0 mt-0.5">
		<Icon name="Zap" size={16} />
	</span>
	<div class="flex-1 min-w-0">
		<h2 class="font-semibold tracking-tight text-[14px] mb-1">Welcome to Trace.</h2>
		<p class="text-[12.5px] opacity-90 mb-3">
			Here is a 3-step tour of <strong class="font-semibold">{projectName}</strong>.
		</p>
		<ol class="text-[12.5px] flex flex-col gap-1.5 mb-3">
			<li>
				<span class="opacity-70">1.</span>
				<a class="font-medium underline-offset-2 hover:underline" href={`/p/${projectSlug}`}>
					Browse the demo features
				</a>
				<span class="opacity-75">— see how Gherkin scenarios are organised.</span>
			</li>
			<li>
				<span class="opacity-70">2.</span>
				<a
					class="font-medium underline-offset-2 hover:underline"
					href={`/p/${projectSlug}/executions`}
				>
					Open the sample test run
				</a>
				<span class="opacity-75">— pass/fail/notes UI in action.</span>
			</li>
			<li>
				<span class="opacity-70">3.</span>
				{#if featureCode}
					<a
						class="font-medium underline-offset-2 hover:underline"
						href={`/p/${projectSlug}/${featureCode}`}
					>
						Edit a feature in Gherkin
					</a>
				{:else}
					<a
						class="font-medium underline-offset-2 hover:underline"
						href={`/p/${projectSlug}`}
					>
						Edit a feature in Gherkin
					</a>
				{/if}
				<span class="opacity-75">— open any feature to see the inline editor.</span>
			</li>
		</ol>
	</div>
	<form
		method="POST"
		action="/?/dismissWelcome"
		use:enhance={() => {
			dismissing = true;
			return async ({ result, update }) => {
				if (result.type === 'success' || result.type === 'redirect') {
					ondismiss?.();
				} else {
					dismissing = false;
				}
				await update({ reset: false });
			};
		}}
	>
		<Button type="submit" variant="ghost" size="sm" disabled={dismissing}>Dismiss</Button>
	</form>
</section>
