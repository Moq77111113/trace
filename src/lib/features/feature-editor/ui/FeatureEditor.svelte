<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';

  import type { EditorApi } from './MonacoWrapper.svelte';
  import EditorHeader    from './EditorHeader.svelte';
  import ConflictModal   from './modals/ConflictModal.svelte';
  import ArchiveModal    from './modals/ArchiveModal.svelte';
  import Description     from './sections/Description.svelte';
  import Gherkin         from './sections/Gherkin.svelte';
  import ManualScenarios from '$lib/features/manual-scenarios/ui/ManualScenarios.svelte';
  import type { ManualScenarioRow } from '$lib/server/features/manual-scenarios';
  import SaveError       from './parts/SaveError.svelte';
  import type { Snippet } from '$lib/shared/gherkin/snippets';
  import { FeatureForm }   from '../model/feature-form.svelte';
  import { GherkinParser } from '../model/gherkin-parser.svelte';
  import { SaveFlow }      from '../model/save.svelte';
  import type { Feature }  from '../model/types';
  import { formatFeatureCode } from '$lib/shared/lib/slug';
  import { formatTraceTag } from '$lib/features/feature-import/lib/trace-tag';

  type ProjectRef = { codePrefix: string };
  type ProjectTag = { name: string; count: number };
  type Group      = { id: string; name: string };

  type Props = {
    data: {
      feature:         Feature;
      project:         ProjectRef;
      projectTags:     ProjectTag[];
      groups:          Group[];
      manualScenarios: ManualScenarioRow[];
    };
    onSaved?: (feature: Feature) => void;
  };

  let { data, onSaved }: Props = $props();

  const form    = untrack(() => new FeatureForm(data.feature));
  const gherkin = untrack(() => new GherkinParser(() => form.fields.content, data.feature.name, data.projectTags));
  const save    = untrack(() => new SaveFlow(form, () => data.feature, onSaved));

  let archiveOpen                 = $state(false);
  let editorApi: EditorApi | null = $state(null);

  const traceCode = $derived(formatFeatureCode(data.project.codePrefix, data.feature.codeSeq));

  function insertSnippet(snippet: Snippet): void {
    if (!editorApi) return;
    if (snippet.mode === 'replace') editorApi.setText(snippet.content);
    else                            editorApi.appendText(snippet.content);
  }
</script>

<form method="POST" action="?/save" use:enhance={save.onSubmit} class="flex flex-col min-h-0 flex-1">
  <input type="hidden" name="version"     value={form.version} />
  <input type="hidden" name="content"     value={form.fields.content} />
  <input type="hidden" name="description" value={form.fields.description} />

  <EditorHeader
    featureName={data.feature.name}
    featureCode={`${data.project.codePrefix}-${data.feature.codeSeq}`}
    featureId={data.feature.id}
    version={form.version}
    dirty={form.dirty}
    groups={data.groups}
    saving={save.saving}
    conflictOpen={save.conflictOpen}
    bind:groupId={form.fields.groupId}
    onGroupChange={(v) => (form.fields.groupId = v)}
    onArchive={() => (archiveOpen = true)}
  />

  {#if save.saveError}
    <SaveError message={save.saveError} />
  {/if}

  <div class="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-surface-2/40 font-mono text-[12px]">
    <span class="text-accent-soft-ink">{formatTraceTag(traceCode)}</span>
  </div>

  <div class="flex flex-col gap-4 p-4 overflow-y-auto flex-1 min-h-0">
    <Description
      featureId={data.feature.id}
      value={form.fields.description}
      onChange={(v) => (form.fields.description = v)}
    />

    <ManualScenarios
      featureId={data.feature.id}
      initial={data.manualScenarios}
    />

    <Gherkin
      featureId={data.feature.id}
      value={form.fields.content}
      empty={gherkin.empty}
      parseErrors={gherkin.parsed.errors.length}
      markers={gherkin.markers}
      completionProvider={gherkin.completionProvider}
      snippets={gherkin.snippets}
      featureCode={traceCode}
      onChange={(v) => (form.fields.content = v)}
      onInsert={insertSnippet}
      bind:api={editorApi}
    />
  </div>
</form>

<ConflictModal
  open={save.conflictOpen}
  currentVersion={save.conflictWith?.version ?? form.version}
  yourVersion={form.version}
  editorName={'someone'}
  onReload={save.reload}
  onCancel={save.dismissConflict}
/>

<ArchiveModal
  open={archiveOpen}
  featureName={data.feature.name}
  onOpenChange={(v) => (archiveOpen = v)}
/>
