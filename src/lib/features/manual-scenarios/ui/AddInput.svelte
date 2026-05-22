<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    featureId: string;
    onError:   (msg: string | null) => void;
  };

  let { featureId, onError }: Props = $props();

  let newName = $state('');
  let saving  = $state(false);
</script>

<form
  class="flex items-center gap-2"
  action="?/addManualScenario"
  method="POST"
  use:enhance={({ formData, cancel }) => {
    const trimmed = newName.trim();
    if (!trimmed) { cancel(); return; }
    formData.set('featureId', featureId);
    formData.set('name',      trimmed);
    onError(null);
    saving = true;
    return async ({ result, update }) => {
      saving = false;
      if (result.type === 'failure') {
        const reason = (result.data as { reason?: string } | undefined)?.reason;
        if (reason === 'name-taken-gherkin')      onError(m.manual_scenario_name_taken_gherkin());
        else if (reason === 'name-taken-manual')  onError(m.manual_scenario_name_taken_manual());
        else                                      onError('add failed');
        return;
      }
      if (result.type === 'success') newName = '';
      await update();
    };
  }}
>
  <input
    class="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
    placeholder={m.manual_scenarios_placeholder()}
    bind:value={newName}
  />
  <Button
    type="submit"
    variant="primary"
    disabled={saving || newName.trim() === ''}
  >{m.manual_scenarios_add()}</Button>
</form>
