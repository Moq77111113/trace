<script lang="ts">
  import DirtyIndicator from '$lib/shared/ui/DirtyIndicator.svelte';
  import Pill           from '$lib/shared/ui/Pill.svelte';
  import Button         from '$lib/shared/ui/Button.svelte';
  import Icon           from '$lib/shared/ui/Icon.svelte';
  import InsertMenu     from './InsertMenu.svelte';
  import type { Snippet } from '$lib/shared/gherkin/snippets';

  type Group = { id: string; name: string };

  type Props = {
    featureName:  string;
    featureCode:  string;
    featureId:    string;
    version:      number;
    dirty:        boolean;
    parseErrors:  number;
    groups:       Group[];
    snippets:     Snippet[];
    saving:       boolean;
    conflictOpen: boolean;
    groupId:      string;
    onGroupChange: (v: string) => void;
    onInsert:     (snippet: Snippet) => void;
    onArchive:    () => void;
  };

  let {
    featureName, featureCode, featureId, version, dirty, parseErrors, groups, snippets,
    saving, conflictOpen, groupId = $bindable(), onGroupChange, onInsert, onArchive,
  }: Props = $props();

  const dirname  = $derived(featureName.split('/').slice(0, -1).join('/'));
  const basename = $derived(featureName.split('/').pop() ?? featureName);
</script>

<header class="flex items-center gap-2.5 px-4 py-2 border-b border-border bg-bg max-md:gap-2 max-md:px-3">
  <span class="font-mono text-[11.5px] text-ink-3 tabular-nums">{featureCode}</span>
  <span class="font-mono text-[12px] text-ink-2 flex items-center gap-1">
    <span class="text-ink-3">{dirname}</span>
    {#if featureName.includes('/')}<span class="text-ink-3">/</span>{/if}
    <span class="text-ink font-medium">{basename}</span>
  </span>
  <DirtyIndicator {dirty} />

  {#if parseErrors > 0}
    <Pill kind="fail" outline>{parseErrors} parse error{parseErrors === 1 ? '' : 's'}</Pill>
  {:else}
    <Pill kind="pass" outline>valid</Pill>
  {/if}

  <div class="ml-auto flex items-center gap-2 flex-wrap">
    <InsertMenu {snippets} {onInsert} />

    <label class="inline-flex items-center gap-2 text-[12px] text-ink-3">
      <span>Group</span>
      <select
        name="groupId"
        bind:value={groupId}
        onchange={(e) => onGroupChange((e.currentTarget as HTMLSelectElement).value)}
        class="h-[30px] px-2.5 text-[12.5px] rounded-md bg-surface text-ink border border-border hover:border-border-strong cursor-pointer"
      >
        <option value="">Ungrouped</option>
        {#each groups as g (g.id)}
          <option value={g.id}>{g.name}</option>
        {/each}
      </select>
    </label>

    <a
      href={`/api/features/${featureId}/export`}
      class="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12.5px] text-ink-2 rounded-md hover:bg-surface-2 hover:text-ink"
    >
      <Icon name="Download" size={13} /> Export
    </a>
    <span class="text-[12px] text-ink-3 tabular-nums font-mono">v{version}</span>
    <Button type="button"   variant="ghost"   size="sm" onclick={onArchive}>Archive</Button>
    <Button type="submit"   variant="primary" disabled={saving || !dirty || conflictOpen}>Save</Button>
  </div>
</header>
