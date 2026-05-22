<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import Kbd    from '$lib/shared/ui/Kbd.svelte';
  import Status from '$lib/shared/ui/Status.svelte';
  import { useSelection, type Verdict } from '../../model/context';
  import { optimisticMark } from '../../model/scenario-marking';
  import { attachShortcut, onPlainKey } from '../../model/shortcuts';
  import { failureMessage } from '$lib/shared/forms/action-result';

  const selection = useSelection();

  let saveError = $state<string | null>(null);
  let form: HTMLFormElement;

  function isVerdict(v: string): v is Verdict {
    return v === 'PASSED' || v === 'FAILED' || v === 'SKIPPED';
  }

  function clickStatus(status: Verdict): void {
    form?.querySelector<HTMLButtonElement>(`button[value="${status}"]`)?.click();
  }

  $effect(() => {
    const offPass = attachShortcut(window, onPlainKey('p'), () => clickStatus('PASSED'));
    const offFail = attachShortcut(window, onPlainKey('f'), () => clickStatus('FAILED'));
    const offSkip = attachShortcut(window, onPlainKey('s'), () => clickStatus('SKIPPED'));
    return () => { offPass(); offFail(); offSkip(); };
  });
</script>

<form
  bind:this={form}
  action="?/setStatus"
  method="POST"
  class="border-t border-border px-5 py-3 flex items-center gap-2 bg-bg max-md:px-3.5 max-md:flex-wrap"
  use:enhance={({ formData }) => {
    const status = formData.get('status');
    const id     = formData.get('scenarioResultId');
    if (typeof status !== 'string' || typeof id !== 'string') return;
    if (!isVerdict(status)) return;

    saveError = null;
    const rollback = optimisticMark(selection, id, status);

    return async ({ result }) => {
      if (result.type === 'failure' || result.type === 'error') {
        rollback();
        saveError = failureMessage(result, 'Save failed');
      }
    };
  }}
>
  <input type="hidden" name="scenarioResultId" value={selection.selected?.id ?? ''}>
  <Button type="submit" name="status" value="PASSED" variant="pass">
    <Status kind="pass" size={12} /> Pass <Kbd>P</Kbd>
  </Button>
  <Button type="submit" name="status" value="FAILED" variant="fail">
    <Status kind="fail" size={12} /> Fail <Kbd>F</Kbd>
  </Button>
  <Button type="submit" name="status" value="SKIPPED" variant="skip">
    <Status kind="skip" size={12} /> Skip <Kbd>S</Kbd>
  </Button>
  <div class="flex-1"></div>
  <span class="text-[11.5px] text-ink-3 max-md:hidden">
    <Kbd>↑</Kbd><Kbd>↓</Kbd> next/prev
  </span>
</form>

{#if saveError}
  <p class="px-5 pb-2 text-[12px] text-fail-ink" role="alert">{saveError}</p>
{/if}
