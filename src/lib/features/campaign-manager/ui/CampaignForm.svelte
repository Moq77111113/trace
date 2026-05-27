<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import Input from '$lib/shared/ui/Input.svelte';
  import { failureMessage } from '$lib/shared/forms/action-result';
  import * as m from '$lib/paraglide/messages';

  let name = $state('');
  let appVersion = $state('');
  let saving = $state(false);
  let error: string | null = $state(null);

  const ERROR_COPY: Record<string, string> = {
    'open-version-conflict': m.campaign_duplicate_version(),
    'name-taken': m.campaign_duplicate_name(),
    'invalid-input': m.error_invalid_input()
  };
</script>

<form
  data-testid="campaign-create-form"
  class="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
  method="POST"
  action="?/create"
  use:enhance={({ formData, cancel }) => {
    if (!name.trim() || !appVersion.trim()) {
      cancel();
      return;
    }
    formData.set('name', name.trim());
    formData.set('appVersion', appVersion.trim());
    error = null;
    saving = true;
    return async ({ result, update }) => {
      saving = false;
      if (result.type === 'failure') {
        const code = failureMessage(result, '');
        error = ERROR_COPY[code] ?? m.error_internal();
        return;
      }
      if (result.type === 'success') {
        name = '';
        appVersion = '';
      }
      await update();
    };
  }}
>
  <div class="flex flex-wrap items-end gap-3">
    <label class="flex flex-col gap-1 text-[12px] text-ink-3">
      {m.campaign_name_label()}
      <Input bind:value={name} />
    </label>
    <label class="flex flex-col gap-1 text-[12px] text-ink-3">
      {m.campaign_version_label()}
      <Input bind:value={appVersion} placeholder={m.campaign_version_placeholder()} />
    </label>
  </div>

  <p class="text-[12px] text-ink-3">{m.campaign_version_hint()}</p>

  {#if error}
    <p class="text-[12px] text-fail-ink">{error}</p>
  {/if}

  <div class="flex justify-end">
    <Button type="submit" variant="primary" disabled={saving || !name.trim() || !appVersion.trim()}>
      {m.campaign_create()}
    </Button>
  </div>
</form>
