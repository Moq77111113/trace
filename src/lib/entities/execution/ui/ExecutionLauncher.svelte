<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import Button from '$lib/shared/ui/Button.svelte';
  import Icon   from '$lib/shared/ui/Icon.svelte';

  type Props = {
    projectSlug: string;
    featureId:   string;
    disabled?:   boolean;
  };

  let { projectSlug, featureId, disabled = false }: Props = $props();

  type StartFailure = { error?: string };

  let starting = $state(false);
  let error    = $state<string | null>(null);

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
  method="POST"
  action="/p/{projectSlug}/executions/new"
  use:enhance={onSubmit}
  class="inline-flex items-center gap-3"
>
  <input type="hidden" name="featureId" value={featureId} />

  <Button type="submit" variant="primary" disabled={disabled || starting}>
    <Icon name="Play" size={13} /> Start run
  </Button>

  {#if error}
    <span class="text-[12px] text-fail-ink" role="alert">{error}</span>
  {/if}
</form>
