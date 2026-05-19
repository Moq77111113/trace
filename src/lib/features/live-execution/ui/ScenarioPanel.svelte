<script lang="ts">
  import Pill          from '$lib/shared/ui/Pill.svelte';
  import Button        from '$lib/shared/ui/Button.svelte';
  import DropZone      from '$lib/shared/ui/DropZone.svelte';
  import Kbd           from '$lib/shared/ui/Kbd.svelte';
  import Status        from '$lib/shared/ui/Status.svelte';
  import Icon          from '$lib/shared/ui/Icon.svelte';
  import Tag           from '$lib/shared/ui/Tag.svelte';
  import ScenarioSteps from '$lib/entities/execution/ui/ScenarioSteps.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import { extractScenarioSteps, extractScenarioTags } from '$lib/shared/gherkin/steps';
  import { formatScenarioDuration } from '$lib/entities/execution/lib/format';
  import type { ScenarioSelection }    from '../model/selection.svelte';
  import type { ScenarioMarking }      from '../model/marking.svelte';
  import type { NotesEditor }          from '../model/notes-editor.svelte';
  import type { AttachmentsUploader }  from '../model/attachments-uploader.svelte';

  type Props = {
    selection:             ScenarioSelection;
    marking:               ScenarioMarking;
    notes:                 NotesEditor;
    attachments:           AttachmentsUploader;
    featureContentAtStart: string;
  };

  let { selection, marking, notes, attachments, featureContentAtStart }: Props = $props();

  const selectedSteps = $derived(
    selection.selected
      ? extractScenarioSteps(featureContentAtStart, selection.selected.scenarioName)
      : []
  );

  const selectedTags = $derived(
    selection.selected
      ? extractScenarioTags(featureContentAtStart, selection.selected.scenarioName)
      : []
  );
</script>

{#if selection.selected}
  {@const kind = toStatusKind(selection.selected.status)}
  <header class="px-5 py-3.5 border-b border-border flex flex-col gap-2 max-md:px-3.5">
    <div class="flex items-center gap-3">
      <Status {kind} size={20} />
      <h2 class="text-[15px] font-semibold tracking-tight flex-1 min-w-0 m-0 truncate">
        {selection.selected.scenarioName}
      </h2>
      <Pill {kind}>{selection.selected.status.toLowerCase()}</Pill>
    </div>
    {#if selectedTags.length > 0}
      <div class="flex items-center gap-1 flex-wrap">
        {#each selectedTags as name (name)}
          <Tag {name} />
        {/each}
      </div>
    {/if}
    <div class="text-[11.5px] text-ink-3 flex items-center gap-2.5 tabular-nums">
      <span>Scenario</span>
      <span class="w-[3px] h-[3px] rounded-full bg-ink-mute"></span>
      <span>{formatScenarioDuration(selection.selected.durationMs) || 'not run yet'}</span>
    </div>
  </header>

  <section class="overflow-auto px-5 py-4 min-h-0 max-md:px-3.5">
    {#if selectedSteps.length > 0}
      <div class="mb-3">
        <ScenarioSteps steps={selectedSteps} scenarioStatus={selection.selected.status} />
      </div>
    {/if}

    {#if selection.selected.errorMessage}
      <div class="px-3 py-2.5 bg-fail-soft border border-fail/30 rounded-md text-[11.5px] text-fail-ink font-mono whitespace-pre-wrap leading-relaxed">
        <b class="font-semibold">Error</b><br />
        {selection.selected.errorMessage}
      </div>
    {/if}

    {#if marking.saveError}
      <p class="mt-3 text-[12px] text-fail-ink" role="alert">{marking.saveError}</p>
    {/if}

    {#if selection.selected.status === 'FAILED'}
      {@const uploaded = attachments.uploadsByScenario[selection.selected.id] ?? []}
      <div class="mt-4 pt-4 border-t border-dashed border-border">
        <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium flex items-center gap-1.5">
          <Icon name="Paperclip" size={11} />
          <span>Evidence</span>
        </div>

        {#if uploaded.length > 0}
          <ul class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 list-none m-0 p-0 mb-2">
            {#each uploaded as attachment (attachment.id)}
              <li class="border border-border rounded-md overflow-hidden bg-surface">
                <div class="h-20 bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_8px,var(--surface)_8px_16px)] grid place-items-center text-ink-3 font-mono text-[10.5px] border-b border-border">
                  {attachment.mimeType.split('/')[0]}
                </div>
                <div class="px-2 py-1.5 text-[11px]">
                  <div class="font-medium truncate">{attachment.filename}</div>
                  <div class="text-ink-3 mt-0.5 tabular-nums">{(attachment.sizeBytes / 1024).toFixed(1)} KB</div>
                </div>
              </li>
            {/each}
          </ul>
        {/if}

        <DropZone onDrop={(items) => attachments.upload(items.map((i) => i.file))}>
          <Icon name="Upload" size={14} />
          <span class="ml-1.5">Drop screenshots, logs, or files — or click to browse</span>
          {#if attachments.uploading}<span class="block mt-1 text-[11px]">Uploading…</span>{/if}
        </DropZone>

        {#if attachments.uploadError}
          <p class="mt-2 text-[11.5px] text-fail-ink" role="alert">{attachments.uploadError}</p>
        {/if}
      </div>
    {/if}

    <div class="mt-4 pt-4 border-t border-dashed border-border">
      <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium">Notes</div>
      <textarea
        class="w-full min-h-14 px-3 py-2 text-[12.5px] leading-relaxed rounded-md bg-surface text-ink-2 placeholder:text-ink-3 border border-border focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:border-accent resize-y"
        rows={3}
        bind:value={notes.notes}
        onblur={notes.flush}
        placeholder="Observations, repro steps, browser info…"
      ></textarea>
      {#if notes.notesError}
        <p class="mt-1 text-[11.5px] text-fail-ink" role="alert">{notes.notesError}</p>
      {/if}
    </div>
  </section>

  <footer class="border-t border-border px-5 py-3 flex items-center gap-2 bg-bg max-md:px-3.5 max-md:flex-wrap">
    <Button variant="pass" onclick={marking.markPassed}>
      <Status kind="pass" size={12} /> Pass <Kbd>P</Kbd>
    </Button>
    <Button variant="fail" onclick={marking.markFailed}>
      <Status kind="fail" size={12} /> Fail <Kbd>F</Kbd>
    </Button>
    <Button variant="skip" onclick={marking.markSkipped}>
      <Status kind="skip" size={12} /> Skip <Kbd>S</Kbd>
    </Button>
    <div class="flex-1"></div>
    <span class="text-[11.5px] text-ink-3 max-md:hidden">
      <Kbd>↑</Kbd><Kbd>↓</Kbd> next/prev
    </span>
  </footer>
{/if}
