<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import Icon   from '$lib/shared/ui/Icon.svelte';
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { SubjectAccess } from '$lib/server/projects/access';
  import type { Action } from '$lib/server/authz/actions';

  type Props = { subject: SubjectAccess };
  let { subject }: Props = $props();

  const isUser    = $derived(subject.subject.kind === 'user');
  const display   = $derived(isUser ? (subject.email ?? '') : m.access_anyone());
  const subjectId = $derived(subject.subject.kind === 'user' ? subject.subject.id : '');

  const verbLabels = $derived({
    'project.access':      m.verb_project_access(),
    'feature.view':        m.verb_feature_view(),
    'execution.review':    m.verb_execution_review(),
    'feature.author':      m.verb_feature_author(),
    'execution.run':       m.verb_execution_run(),
    'campaign.manage':     m.verb_campaign_manage(),
    'project.manage':      m.verb_project_manage(),
    'instance.administer': m.verb_instance_administer(),
  } satisfies Record<Action, string>);
</script>

<div class="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3 border-t border-border first:border-t-0 max-md:grid-cols-[1fr_auto] max-md:gap-2">
  <div class="min-w-0">
    <span class="font-medium text-[13px] truncate">{display}</span>
    <div class="flex flex-wrap gap-1 mt-1">
      {#each subject.effectiveVerbs as verb (verb)}
        <Pill kind="neutral">{verbLabels[verb]}</Pill>
      {/each}
    </div>
  </div>

  {#if subject.role === 'custom'}
    <Pill kind="neutral">{m.role_custom()}</Pill>
  {:else}
    <form method="POST" action="?/setRole" use:enhance>
      <input type="hidden" name="subjectKind" value={subject.subject.kind} />
      {#if isUser}<input type="hidden" name="subjectId" value={subjectId} />{/if}
      <select
        name="role"
        onchange={(e) => e.currentTarget.form?.requestSubmit()}
        class="h-[30px] px-2 text-[12.5px] rounded-md bg-surface text-ink border border-border"
      >
        <option value="viewer" selected={subject.role === 'viewer'}>{m.role_viewer()}</option>
        <option value="editor" selected={subject.role === 'editor'}>{m.role_editor()}</option>
        {#if isUser}<option value="manager" selected={subject.role === 'manager'}>{m.role_manager()}</option>{/if}
      </select>
    </form>
  {/if}

  <form method="POST" action="?/remove" use:enhance>
    <input type="hidden" name="subjectKind" value={subject.subject.kind} />
    {#if isUser}<input type="hidden" name="subjectId" value={subjectId} />{/if}
    <Button type="submit" variant="ghost" size="sm" iconOnly aria-label={m.access_remove()}>
      <Icon name="Trash" size={13} />
    </Button>
  </form>
</div>
