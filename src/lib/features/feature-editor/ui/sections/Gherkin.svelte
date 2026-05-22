<script lang="ts">
  import { untrack } from 'svelte';
  import type * as Monaco from 'monaco-editor';
  import CollapsibleSection from '$lib/shared/ui/CollapsibleSection.svelte';
  import { persistedToggle } from '$lib/shared/storage/persisted-toggle.svelte';
  import Pill from '$lib/shared/ui/Pill.svelte';
  import MonacoWrapper, { type EditorApi } from '../MonacoWrapper.svelte';
  import InsertMenu from '../InsertMenu.svelte';
  import MonacoEmptyHint from '../parts/MonacoEmptyHint.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { Snippet } from '$lib/shared/gherkin/snippets';

  type Marker = { line: number; column?: number; message: string };
  type CompletionProvider = (
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ) => Monaco.languages.CompletionList;

  type Props = {
    featureId:          string;
    value:              string;
    empty:              boolean;
    parseErrors:        number;
    markers:            Marker[];
    completionProvider: CompletionProvider;
    snippets:           Snippet[];
    featureCode:        string;
    onChange:           (next: string) => void;
    onInsert:           (snippet: Snippet) => void;
    api?:               EditorApi | null;
  };

  let {
    featureId, value, empty, parseErrors, markers, completionProvider, snippets, featureCode,
    onChange, onInsert, api = $bindable<EditorApi | null>(null),
  }: Props = $props();

  const open = untrack(() =>
    persistedToggle(`feature-editor-gherkin:${featureId}`, !empty, 'session'),
  );
</script>

<CollapsibleSection
  title={m.feature_editor_gherkin_title()}
  subtitle={m.feature_editor_gherkin_subtitle()}
  bind:open={open.value}
  {empty}
  addLabel={m.feature_editor_gherkin_add()}
  onAdd={() => {
    open.value = true;
    onChange('');
  }}
>
  <div class="flex items-center gap-2">
    <InsertMenu {snippets} {onInsert} />
    {#if parseErrors > 0}
      <Pill kind="fail" outline>{parseErrors} parse error{parseErrors === 1 ? '' : 's'}</Pill>
    {:else}
      <Pill kind="pass" outline>valid</Pill>
    {/if}
  </div>

  <div class="relative min-h-[400px] border border-border rounded-md overflow-hidden">
    <MonacoWrapper {value} {onChange} {markers} {completionProvider} {featureCode} bind:api />
    {#if empty}<MonacoEmptyHint />{/if}
  </div>
</CollapsibleSection>
