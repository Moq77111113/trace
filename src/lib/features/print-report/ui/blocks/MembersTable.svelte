<script lang="ts">
  import Pill from '$lib/shared/ui/Pill.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';

  type Member = {
    featureId:         string;
    code:              string;
    name:              string;
    required:          boolean;
    status:            string | null;
    latestExecutionId: string | null;
  };

  type Props = { members: Member[]; projectSlug: string };
  let { members, projectSlug }: Props = $props();
</script>

<table class="w-full text-left border-collapse mb-6">
  <thead class="text-[11px] uppercase tracking-[0.07em] text-ink-3">
    <tr class="border-b border-border">
      <th class="py-2 pr-3 font-medium">code</th>
      <th class="py-2 pr-3 font-medium">feature</th>
      <th class="py-2 pr-3 font-medium">required?</th>
      <th class="py-2 pr-3 font-medium">latest run</th>
    </tr>
  </thead>
  <tbody>
    {#each members as member (member.featureId)}
      <tr class="border-b border-border align-top">
        <td class="py-2 pr-3 font-mono text-[12px] tabular-nums">{member.code}</td>
        <td class="py-2 pr-3 text-[13px]">{member.name}</td>
        <td class="py-2 pr-3 text-[12px] text-ink-3">{member.required ? 'required' : 'optional'}</td>
        <td class="py-2 pr-3 text-[12px]">
          {#if member.status && member.latestExecutionId}
            <a href="/p/{projectSlug}/executions/{member.latestExecutionId}/report.html" class="text-accent-soft-ink hover:underline">
              <Pill kind={toStatusKind(member.status)}>{member.status.toLowerCase()}</Pill>
            </a>
          {:else}
            <span class="text-ink-3">never run</span>
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>
