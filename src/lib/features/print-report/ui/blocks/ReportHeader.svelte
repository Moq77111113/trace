<script lang="ts">
  import Pill from '$lib/shared/ui/Pill.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';

  type MetaPair = { label: string; value: string };

  type Props = {
    title:  string;
    code?:  string;
    status: string | null;
    meta:   MetaPair[];
  };

  let { title, code, status, meta }: Props = $props();
  const kind = $derived(status ? toStatusKind(status) : null);
</script>

<header class="flex flex-col gap-2 mb-6">
  <div class="flex items-center gap-3 flex-wrap">
    {#if code}
      <span class="font-mono text-[12px] text-ink-3 tabular-nums">{code}</span>
    {/if}
    <h1 class="text-[20px] font-semibold tracking-tight m-0">{title}</h1>
    {#if kind && status}
      <Pill {kind}>{status.toLowerCase()}</Pill>
    {/if}
  </div>

  {#if meta.length > 0}
    <div class="flex items-center gap-2 text-[12px] text-ink-3 flex-wrap">
      {#each meta as pair, i (pair.label)}
        {#if i > 0}<span class="size-[3px] rounded-full bg-ink-mute"></span>{/if}
        <span><span class="text-ink-mute mr-1">{pair.label}</span>{pair.value}</span>
      {/each}
    </div>
  {/if}
</header>
