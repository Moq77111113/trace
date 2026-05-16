<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { DropdownMenu } from 'bits-ui';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type * as Monaco from 'monaco-editor';

  import MonacoWrapper, { type EditorApi } from './MonacoWrapper.svelte';
  import ConflictModal  from './ConflictModal.svelte';
  import DirtyIndicator from './DirtyIndicator.svelte';
  import Pill           from '$lib/components/ui/Pill.svelte';
  import Button         from '$lib/components/ui/Button.svelte';
  import Icon           from '$lib/components/ui/Icon.svelte';
  import Modal          from '$lib/components/ui/Modal.svelte';
  import { parse }      from '$lib/gherkin/parse';
  import { buildSnippets, type Snippet } from '$lib/gherkin/snippets';

  type ParseErrors = { line: number; column?: number; message: string }[] | null;

  type Feature = {
    id:          string;
    name:        string;
    content:     string;
    version:     number;
    parseErrors: ParseErrors;
    groupId:     string | null;
  };

  type ProjectTag = { name: string; count: number };
  type Group = { id: string; name: string };

  type Props = {
    data: { feature: Feature; projectTags: ProjectTag[]; groups: Group[] };
    onSaved?: (feature: Feature) => void;
  };

  type SaveSuccess = { feature: Feature };
  type SaveFailure = { error?: string; conflict?: boolean; currentFeature?: Feature };

  let { data, onSaved }: Props = $props();

  let initialContent = $state(untrack(() => data.feature.content));
  let content        = $state(untrack(() => data.feature.content));
  let version        = $state(untrack(() => data.feature.version));
  let groupId        = $state<string>(untrack(() => data.feature.groupId ?? ''));
  let conflictOpen   = $state(false);
  let conflictWith   = $state<Feature | null>(null);
  let saving         = $state(false);
  let saveError      = $state<string | null>(null);
  let archiveOpen    = $state(false);
  let archiving      = $state(false);
  let archiveForm    = $state<HTMLFormElement | undefined>();

  function confirmArchive(): void {
    if (!archiveForm) return;
    archiving = true;
    archiveForm.requestSubmit();
  }

  let editorApi = $state<EditorApi | null>(null);

  let parsed = $state(parse(untrack(() => content)));
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const snippets = $derived(buildSnippets(data.feature.name));
  const empty    = $derived(content.trim() === '');

  function insertSnippet(snippet: Snippet): void {
    if (!editorApi) return;
    if (snippet.mode === 'replace') editorApi.setText(snippet.content);
    else                            editorApi.appendText(snippet.content);
  }

  $effect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const snapshot = content;
    debounceTimer = setTimeout(() => { parsed = parse(snapshot); }, 300);
  });

  const dirty   = $derived(content !== initialContent);
  const markers = $derived(
    parsed.errors.map((e) =>
      e.column === undefined
        ? { line: e.line, message: e.message }
        : { line: e.line, column: e.column, message: e.message },
    ),
  );

  function buildCompletion(
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): Monaco.languages.CompletionList {
    const word  = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      startColumn:     word.startColumn,
      endLineNumber:   position.lineNumber,
      endColumn:       word.endColumn,
    };

    const lineBefore = model.getValueInRange({ ...range, startColumn: 1 });
    if (!lineBefore.includes('@')) return { suggestions: [] };

    const existing = new Set(parsed.tags);

    const suggestions = data.projectTags.map((t) => ({
      label:      `@${t.name}`,
      kind:       17,
      insertText: t.name,
      detail:     `${t.count} feature${t.count === 1 ? '' : 's'}`,
      range,
      sortText:   existing.has(t.name)
        ? `b-${t.name}`
        : `a-${String(1_000_000 - t.count).padStart(7, '0')}`,
    }));

    return { suggestions };
  }

  function onMonacoChange(v: string): void {
    content = v;
  }

  const onSubmit: SubmitFunction<SaveSuccess, SaveFailure> = () => {
    saving    = true;
    saveError = null;

    return async ({ result }) => {
      saving = false;

      if (result.type === 'success' && result.data?.feature) {
        const saved = result.data.feature;
        initialContent = saved.content;
        content        = saved.content;
        version        = saved.version;
        groupId        = saved.groupId ?? '';
        onSaved?.(saved);
        return;
      }

      if (result.type === 'failure' && result.data?.conflict && result.data.currentFeature) {
        conflictWith = result.data.currentFeature;
        conflictOpen = true;
        return;
      }

      if (result.type === 'failure' && result.data?.error) {
        saveError = result.data.error;
        return;
      }

      if (result.type === 'error') {
        saveError = result.error.message;
      }
    };
  };

  function reload(): void {
    conflictOpen = false;
    conflictWith = null;
    void invalidateAll().then(() => {
      initialContent = data.feature.content;
      content        = data.feature.content;
      version        = data.feature.version;
    });
  }
</script>

<form method="POST" action="?/save" use:enhance={onSubmit} class="flex flex-col min-h-0 flex-1">
  <input type="hidden" name="version" value={version} />
  <input type="hidden" name="content" value={content} />

  <header class="flex items-center gap-2.5 px-4 py-2 border-b border-border bg-bg max-md:gap-2 max-md:px-3">
    <span class="font-mono text-[12px] text-ink-2 flex items-center gap-1">
      <span class="text-ink-3">{data.feature.name.split('/').slice(0, -1).join('/')}</span>
      {#if data.feature.name.includes('/')}<span class="text-ink-3">/</span>{/if}
      <span class="text-ink font-medium">{data.feature.name.split('/').pop()}</span>
    </span>
    <DirtyIndicator {dirty} />

    {#if parsed.errors.length > 0}
      <Pill kind="fail" outline>{parsed.errors.length} parse error{parsed.errors.length === 1 ? '' : 's'}</Pill>
    {:else}
      <Pill kind="pass" outline>valid</Pill>
    {/if}

    <div class="ml-auto flex items-center gap-2 flex-wrap">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12.5px] font-medium rounded-md bg-surface text-ink border border-border hover:bg-surface-2 hover:border-border-strong cursor-pointer"
        >
          Insert <Icon name="ChevronDown" size={13} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={4}
            align="end"
            class="min-w-[200px] bg-surface border border-border rounded-lg shadow-[var(--shadow-pop)] p-1 z-50"
          >
            {#each snippets as snippet (snippet.key)}
              <DropdownMenu.Item
                class="px-2.5 py-1.5 text-[12.5px] text-ink-2 rounded-sm cursor-pointer data-[highlighted]:bg-surface-2 data-[highlighted]:text-ink outline-none"
                onSelect={() => insertSnippet(snippet)}
              >
                {snippet.label}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <label class="inline-flex items-center gap-2 text-[12px] text-ink-3">
        <span>Group</span>
        <select
          name="groupId"
          bind:value={groupId}
          class="h-[30px] px-2.5 text-[12.5px] rounded-md bg-surface text-ink border border-border hover:border-border-strong cursor-pointer"
        >
          <option value="">Ungrouped</option>
          {#each data.groups as g (g.id)}
            <option value={g.id}>{g.name}</option>
          {/each}
        </select>
      </label>

      <a
        href={`/api/features/${data.feature.id}/export`}
        class="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12.5px] text-ink-2 rounded-md hover:bg-surface-2 hover:text-ink"
      >
        <Icon name="Download" size={13} /> Export
      </a>
      <span class="text-[12px] text-ink-3 tabular-nums font-mono">v{version}</span>
      <Button type="button" variant="ghost" size="sm" onclick={() => (archiveOpen = true)}>Archive</Button>
      <Button type="submit" variant="primary" disabled={saving || !dirty || conflictOpen}>Save</Button>
    </div>
  </header>

  {#if saveError}
    <p class="px-4 py-2 text-[12px] text-fail-ink bg-fail-soft border-b border-fail/30" role="alert">{saveError}</p>
  {/if}

  <div class="relative flex-1 min-h-0">
    <MonacoWrapper
      value={content}
      onChange={onMonacoChange}
      markers={markers}
      completionProvider={buildCompletion}
      bind:api={editorApi}
    />

    {#if empty}
      <div class="pointer-events-none absolute right-4 top-4 text-[11.5px] text-ink-3 italic bg-surface/85 backdrop-blur-sm px-2.5 py-1.5 rounded-md border border-border">
        Empty — use <span class="not-italic font-semibold text-ink">Insert</span> above to start
      </div>
    {/if}
  </div>
</form>

<ConflictModal
  open={conflictOpen}
  currentVersion={conflictWith?.version ?? version}
  yourVersion={version}
  editorName={'someone'}
  onReload={reload}
  onCancel={() => { conflictOpen = false; conflictWith = null; }}
/>

<form bind:this={archiveForm} method="POST" action="?/archive" use:enhance></form>

<Modal open={archiveOpen} onOpenChange={(v) => (archiveOpen = v)} title="Archive feature">
  <p>Archive <strong>{data.feature.name}</strong>?</p>
  <p class="text-[12px] text-ink-3 mt-2">
    It will be hidden from this project. Existing run history is preserved.
  </p>

  {#snippet footer()}
    <Button variant="ghost" onclick={() => (archiveOpen = false)}>Cancel</Button>
    <Button variant="danger" disabled={archiving} onclick={confirmArchive}>Archive</Button>
  {/snippet}
</Modal>
