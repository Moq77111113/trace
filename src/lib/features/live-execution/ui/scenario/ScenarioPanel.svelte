<script lang="ts">
  import Pill          from '$lib/shared/ui/Pill.svelte';
  import Button        from '$lib/shared/ui/Button.svelte';
  import Kbd           from '$lib/shared/ui/Kbd.svelte';
  import Status        from '$lib/shared/ui/Status.svelte';
  import Tag           from '$lib/shared/ui/Tag.svelte';
  import ScenarioSteps from '$lib/entities/execution/ui/ScenarioSteps.svelte';
  import NotesBlock    from './NotesBlock.svelte';
  import EvidenceBlock from './EvidenceBlock.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import { extractScenarioSteps, extractScenarioTags } from '$lib/shared/gherkin/steps';
  import { formatScenarioDuration } from '$lib/entities/execution/lib/format';
  import type { ScenarioSelection }    from '../../model/selection.svelte';
  import type { ScenarioMarking }      from '../../model/marking.svelte';
  import type { ScenarioNotesEditor }  from '../../model/notes-editor.svelte';
  import type { AttachmentsUploader }  from '../../model/attachments-uploader.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    selection:             ScenarioSelection;
    marking:               ScenarioMarking;
    notes:                 ScenarioNotesEditor;
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
    {#if selection.selected.source === 'MANUAL'}
      <p class="mb-3 text-[12px] text-ink-3 italic">
        {m.manual_scenario_no_steps()}
      </p>
    {:else if selectedSteps.length > 0}
      <div class="mb-3">
        <ScenarioSteps steps={selectedSteps} scenarioStatus={selection.selected.status} />
      </div>
    {/if}

    {#if selection.selected.errorMessage}
      <div class="px-3 py-2.5 bg-fail-soft border border-fail/30 rounded-md text-[11.5px] text-fail-ink font-mono whitespace-pre-wrap leading-relaxed mb-4">
        <b class="font-semibold">Error</b><br />
        {selection.selected.errorMessage}
      </div>
    {/if}

    {#if marking.saveError}
      <p class="mt-3 text-[12px] text-fail-ink" role="alert">{marking.saveError}</p>
    {/if}

    <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 mt-4 pt-4 border-t border-dashed border-border max-md:grid-cols-1">
      <NotesBlock {notes} />
      <EvidenceBlock {selection} {attachments} />
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
