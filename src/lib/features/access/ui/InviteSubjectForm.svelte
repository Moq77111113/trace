<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import Icon   from '$lib/shared/ui/Icon.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { UserOption } from '$lib/server/projects/access';

  type Props = { users: UserOption[]; anyUserGranted: boolean };
  let { users, anyUserGranted }: Props = $props();

  let selected = $state(untrack(() => (users[0] ? `user:${users[0].id}` : 'any-user')));
  const isAnyUser = $derived(selected === 'any-user');
</script>

<form method="POST" action="?/setRole" use:enhance class="flex flex-wrap items-end gap-2 mb-7">
  <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium flex-1 min-w-[200px]">
    {m.access_subject_label()}
    <select bind:value={selected} class="h-[34px] px-2.5 text-[13px] rounded-md bg-surface text-ink border border-border">
      {#each users as u (u.id)}
        <option value={`user:${u.id}`}>{u.email}</option>
      {/each}
      {#if !anyUserGranted}
        <option value="any-user">{m.access_anyone()}</option>
      {/if}
    </select>
  </label>

  <input type="hidden" name="subjectKind" value={isAnyUser ? 'any-user' : 'user'} />
  {#if !isAnyUser}<input type="hidden" name="subjectId" value={selected.slice('user:'.length)} />{/if}

  <label class="flex flex-col gap-1 text-[11px] uppercase tracking-[0.07em] text-ink-3 font-medium">
    {m.access_role_label()}
    <select name="role" class="h-[34px] px-2.5 text-[13px] rounded-md bg-surface text-ink border border-border">
      <option value="viewer">{m.role_viewer()}</option>
      <option value="editor">{m.role_editor()}</option>
      {#if !isAnyUser}<option value="manager">{m.role_manager()}</option>{/if}
    </select>
  </label>

  <Button type="submit" variant="primary">
    <Icon name="Plus" size={13} /> {m.access_invite_cta()}
  </Button>
</form>
