<script lang="ts">
  import { enhance } from '$app/forms';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    scenarioId: string;
    onError:    (msg: string | null) => void;
  };

  let { scenarioId, onError }: Props = $props();

  let action   = $state('');
  let expected = $state('');
  let saving   = $state(false);
</script>

<form
  action="?/addStep"
  method="POST"
  class="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-start"
  use:enhance={({ formData, cancel }) => {
    const trimmed = action.trim();
    if (!trimmed) { cancel(); return; }
    formData.set('scenarioId', scenarioId);
    formData.set('action', trimmed);
    formData.set('expected', expected.trim());
    onError(null);
    saving = true;
    return async ({ result, update }) => {
      saving = false;
      if (result.type === 'failure') {
        onError(m.manual_step_error());
        return;
      }
      if (result.type === 'success') { action = ''; expected = ''; }
      await update();
    };
  }}
>
  <span class="w-[1ch]" aria-hidden="true"></span>
  <input
    bind:value={action}
    placeholder={m.manual_step_action_placeholder()}
    class="rounded-md border border-border bg-surface px-2 py-1.5 text-[12.5px]"
  />
  <input
    bind:value={expected}
    placeholder={m.manual_step_expected_placeholder()}
    class="rounded-md border border-border bg-surface px-2 py-1.5 text-[12.5px] text-ink-3"
  />
  <button
    type="submit"
    disabled={saving || action.trim() === ''}
    class="text-[12px] text-ink-2 hover:text-ink-1 disabled:opacity-40 px-1"
  >{m.manual_steps_add()}</button>
</form>
