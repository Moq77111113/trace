<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import Button from '$lib/shared/ui/Button.svelte';
  import Icon   from '$lib/shared/ui/Icon.svelte';
  import Gate   from '$lib/shared/authz/Gate.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = { failedCount: number };
  let { failedCount }: Props = $props();

  let rerunning = $state(false);
  let error     = $state<string | null>(null);

  const onSubmit: SubmitFunction = () => {
    rerunning = true;
    error     = null;
    return async ({ result, update }) => {
      if (result.type === 'redirect') {
        await update();
        return;
      }
      rerunning = false;
      if (result.type === 'failure') {
        error = (result.data as { error?: string } | undefined)?.error ?? `Re-run failed (${result.status})`;
      } else if (result.type === 'error') {
        error = result.error.message;
      }
    };
  };
</script>

<form method="POST" action="?/rerunFailed" use:enhance={onSubmit} class="inline-flex">
  <Gate can="execution.run" disable>
    <Button type="submit" variant="primary" disabled={rerunning}>
      <Icon name="RefreshCw" size={13} />
      {m.execution_rerun_failed({ count: failedCount })}
    </Button>
  </Gate>
</form>

{#if error}
  <span class="text-[12px] text-fail-ink" role="alert">{error}</span>
{/if}
