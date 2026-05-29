<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import { failureReason } from '$lib/shared/forms/action-result';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    featureId: string;
    onError:   (msg: string | null) => void;
  };

  let { featureId, onError }: Props = $props();

  let newName  = $state('');
  let action   = $state('');
  let expected = $state('');
  let saving   = $state(false);
</script>

<form
  class="flex flex-col gap-2"
  action="?/addManualScenario"
  method="POST"
  use:enhance={({ formData, cancel }) => {
    const name = newName.trim();
    const act  = action.trim();
    if (!name || !act) { cancel(); return; }
    formData.set('featureId', featureId);
    formData.set('name',      name);
    formData.set('action',    act);
    formData.set('expected',  expected.trim());
    onError(null);
    saving = true;
    return async ({ result, update }) => {
      saving = false;
      if (result.type === 'failure') {
        const reason = failureReason(result);
        if (reason === 'name-taken-gherkin')      onError(m.manual_scenario_name_taken_gherkin());
        else if (reason === 'name-taken-manual')  onError(m.manual_scenario_name_taken_manual());
        else                                      onError('add failed');
        return;
      }
      if (result.type === 'success') { newName = ''; action = ''; expected = ''; }
      await update();
    };
  }}
>
  <input
    class="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
    placeholder={m.manual_scenarios_placeholder()}
    bind:value={newName}
  />
  <input
    class="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
    placeholder={m.manual_step_action_placeholder()}
    bind:value={action}
  />
  <div class="flex items-center gap-2">
    <input
      class="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-3"
      placeholder={m.manual_step_expected_placeholder()}
      bind:value={expected}
    />
    <Button
      type="submit"
      variant="primary"
      disabled={saving || newName.trim() === '' || action.trim() === ''}
    >{m.manual_scenarios_add()}</Button>
  </div>
</form>
