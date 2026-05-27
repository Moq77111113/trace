<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import Select from '$lib/shared/ui/Select.svelte';
  import * as m from '$lib/paraglide/messages';

  type Candidate = { id: string; label: string };
  type Props = { candidates: Candidate[] };
  let { candidates }: Props = $props();

  let featureId = $state('');

  const options = $derived(candidates.map((c) => ({ value: c.id, label: c.label })));
</script>

<form
  class="flex items-end gap-2"
  method="POST"
  action="?/addFeature"
  use:enhance={({ formData, cancel }) => {
    if (!featureId) {
      cancel();
      return;
    }
    formData.set('featureId', featureId);
    return async ({ update }) => {
      featureId = '';
      await update();
    };
  }}
>
  <Select
    value={featureId}
    onValueChange={(v) => (featureId = v)}
    {options}
    placeholder={m.campaign_add_member()}
  />
  <Button type="submit" variant="secondary" disabled={!featureId}>{m.campaign_add_member()}</Button>
</form>
