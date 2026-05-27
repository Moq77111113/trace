<script lang="ts" module>
  export type MemberRunStatus = 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'ABORTED';

  export type CampaignMember = {
    featureId: string;
    code:      string;
    name:      string;
    required:  boolean;
    position:  number;
    status:    MemberRunStatus | null;
  };
</script>

<script lang="ts">
  import { enhance } from '$app/forms';
  import Badge from '$lib/shared/ui/Badge.svelte';
  import Button from '$lib/shared/ui/Button.svelte';
  import Gate from '$lib/shared/authz/Gate.svelte';
  import { statusBadgeVariant } from '$lib/entities/execution/lib/format';
  import * as m from '$lib/paraglide/messages';

  type Props = { member: CampaignMember; locked: boolean };
  let { member, locked }: Props = $props();

  function statusLabel(status: MemberRunStatus): string {
    if (status === 'PASSED')      return m.campaign_outcome_passed();
    if (status === 'FAILED')      return m.campaign_outcome_failed();
    if (status === 'IN_PROGRESS') return m.campaign_status_running();
    if (status === 'SKIPPED')     return m.campaign_status_skipped();
    return m.campaign_status_aborted();
  }
</script>

<li class="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
  <span class="font-mono text-[12px] text-ink-3">{member.code}</span>
  <span class="min-w-0 flex-1 truncate text-[13px] text-ink">{member.name}</span>

  {#if member.status === null}
    <Badge variant="neutral" glyph={false}>{m.campaign_not_run()}</Badge>
  {:else}
    <Badge variant={statusBadgeVariant(member.status)}>{statusLabel(member.status)}</Badge>
  {/if}

  {#if !locked}
    <Gate can="campaign.manage">
      <form method="POST" action="?/toggleRequired" use:enhance>
        <input type="hidden" name="featureId" value={member.featureId} />
        <input type="hidden" name="required" value={(!member.required).toString()} />
        <button type="submit" class="rounded border border-border px-1.5 py-0.5 text-[11.5px] text-ink-3 hover:text-ink">
          {member.required ? m.campaign_required() : m.campaign_optional()}
        </button>
      </form>
    </Gate>

    <Gate can="execution.run">
      <form method="POST" action="?/startRun" use:enhance>
        <input type="hidden" name="featureId" value={member.featureId} />
        <Button type="submit" variant="secondary" size="sm">{m.campaign_run()}</Button>
      </form>
    </Gate>

    <Gate can="campaign.manage">
      <form data-testid="member-remove-form" method="POST" action="?/removeFeature" use:enhance>
        <input type="hidden" name="featureId" value={member.featureId} />
        <button type="submit" aria-label={m.campaign_remove_member()} class="text-lg leading-none text-ink-3 hover:text-fail-ink">×</button>
      </form>
    </Gate>
  {/if}
</li>
