<script lang="ts">
  import { flushSync, onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import Button from '$lib/components/ui/Button.svelte';
  import { ensureIdentity, getStoredIdentity } from '$lib/identity';

  type Props = {
    projectId: string;
    featureId: string;
    disabled?: boolean;
  };

  let { projectId, featureId, disabled = false }: Props = $props();

  type StartFailure = { error?: string };

  let executedBy = $state('');
  let starting   = $state(false);
  let error      = $state<string | null>(null);
  let formEl:     HTMLFormElement | undefined = $state();

  onMount(() => {
    executedBy = getStoredIdentity();
  });

  function handleClick(event: MouseEvent): void {
    if (executedBy) return;

    event.preventDefault();
    const entered = ensureIdentity();
    if (!entered) return;

    flushSync(() => {
      executedBy = entered;
    });
    formEl?.requestSubmit();
  }

  const onSubmit: SubmitFunction<never, StartFailure> = () => {
    starting = true;
    error    = null;

    return async ({ result, update }) => {
      if (result.type === 'redirect') {
        await update();
        return;
      }

      starting = false;

      if (result.type === 'failure') {
        error = result.data?.error ?? `Start run failed (${result.status})`;
        return;
      }

      if (result.type === 'error') {
        error = result.error.message;
      }
    };
  };
</script>

<form
  bind:this={formEl}
  method="POST"
  action="/projects/{projectId}/runs/new"
  use:enhance={onSubmit}
  class="inline-flex items-center gap-3"
>
  <input type="hidden" name="featureId"  value={featureId} />
  <input type="hidden" name="executedBy" value={executedBy} />

  <Button
    type="submit"
    variant="secondary"
    disabled={disabled || starting}
    loading={starting}
    onclick={handleClick}
  >
    Start run
  </Button>

  {#if error}
    <span class="text-xs text-state-failed" role="alert">{error}</span>
  {/if}
</form>
