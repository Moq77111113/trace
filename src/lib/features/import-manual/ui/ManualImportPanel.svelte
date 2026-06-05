<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import { failureMessage } from '$lib/shared/forms/action-result';
  import {
    buildGroupingTree,
    FALLBACK_FEATURE,
    type GroupingNode,
  } from '$lib/shared/import-manual/grouping';
  import { markCollisions, type ExistingCorpus } from '$lib/shared/import-manual/collisions';
  import type { GroupingField, ImportIR, ImportedScenario, ScenarioDecision as Decision, SourceId } from '$lib/shared/import-manual/ir';
  import GroupingTree from './GroupingTree.svelte';

  type Outcome = {
    imported: number;
    skipped:  number;
    failed:   { ref: string; name: string; reason: string }[];
  };

  type Parsed = {
    previewId:            string;
    sourceId:             SourceId;
    scenarios:            ImportedScenario[];
    guessedGroupingField: GroupingField;
    existing:             [string, string[]][];
  };

  function isParsed(data: unknown): data is { manualPreview: Parsed } {
    return typeof data === 'object' && data !== null && 'manualPreview' in data;
  }

  function isCommitted(data: unknown): data is { manualOutcome: Outcome } {
    return typeof data === 'object' && data !== null && 'manualOutcome' in data;
  }

  let parsed           = $state<Parsed | null>(null);
  let groupingField    = $state<GroupingField>('fixed');
  let fixedFeatureName = $state(FALLBACK_FEATURE);
  let decisions        = $state<Record<string, Decision>>({});
  let outcome          = $state<Outcome | null>(null);
  let uploading        = $state(false);
  let committing       = $state(false);
  let error            = $state<string | null>(null);

  const existingCorpus = $derived<ExistingCorpus>(
    new Map((parsed?.existing ?? []).map(([name, names]) => [name, new Set(names)])),
  );
  const ir = $derived<ImportIR | null>(
    parsed ? { sourceId: parsed.sourceId, scenarios: parsed.scenarios } : null,
  );
  const tree = $derived<GroupingNode[]>(
    ir ? buildGroupingTree(ir, groupingField, fixedFeatureName) : [],
  );
  const collisions = $derived(markCollisions(tree, existingCorpus));
  const effectiveDecisions = $derived<Record<string, Decision>>(
    Object.fromEntries(
      (parsed?.scenarios ?? []).map((s) => [
        s.ref,
        decisions[s.ref] ?? (collisions.get(s.ref) ? 'rename' : 'import'),
      ]),
    ),
  );
  const keptCount = $derived(
    Object.values(effectiveDecisions).filter((d) => d !== 'skip').length,
  );

  const FIELDS: { value: GroupingField; label: string }[] = [
    { value: 'folder',    label: 'Folder'        },
    { value: 'component', label: 'Component'     },
    { value: 'issue',     label: 'Linked issue'  },
    { value: 'fixed',     label: 'One feature'   },
  ];

  function onParsed(next: Parsed): void {
    parsed           = next;
    groupingField    = next.guessedGroupingField;
    fixedFeatureName = FALLBACK_FEATURE;
    decisions        = {};
    outcome          = null;
  }

  let formEl   = $state<HTMLFormElement | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);

  const SAMPLE_URL  = '/samples/zephyr-sample.xml';
  const SAMPLE_NAME = 'zephyr-sample.xml';

  async function trySample(): Promise<void> {
    if (!formEl || !fileInput) return;
    error = null;
    const response = await fetch(SAMPLE_URL);
    const blob     = await response.blob();
    const file     = new File([blob], SAMPLE_NAME, { type: 'application/xml' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    formEl.requestSubmit();
  }
</script>

<div class="flex flex-col gap-6">
  <form
    bind:this={formEl}
    action="?/manualPreview"
    method="POST"
    enctype="multipart/form-data"
    use:enhance={() => {
      error     = null;
      uploading = true;
      return async ({ result, update }) => {
        uploading = false;
        if (result.type === 'failure' || result.type === 'error') {
          error = failureMessage(result, 'Could not read this file');
          return;
        }
        if (result.type === 'success' && isParsed(result.data)) {
          onParsed(result.data.manualPreview);
        }
        await update({ reset: false });
      };
    }}
    class="flex items-center gap-3 flex-wrap"
  >
    <input
      bind:this={fileInput}
      type="file"
      name="file"
      required
      class="text-[12.5px] text-ink-3 file:mr-3 file:h-[30px] file:px-3 file:rounded-md file:border file:border-border file:bg-surface file:text-ink file:text-[12.5px] file:cursor-pointer hover:file:bg-surface-2"
    />
    <Button type="submit" variant="secondary" disabled={uploading}>
      {uploading ? 'Reading…' : 'Preview import'}
    </Button>
    <Button type="button" variant="ghost" disabled={uploading} onclick={trySample}>
      Try a sample
    </Button>
  </form>

  {#if parsed}
    <fieldset class="flex flex-col gap-2">
      <legend class="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3 mb-1">
        Group scenarios by
      </legend>
      <div class="flex items-center gap-4 flex-wrap text-[13px] text-ink">
        {#each FIELDS as field (field.value)}
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="grouping" value={field.value} bind:group={groupingField} />
            {field.label}
          </label>
        {/each}
      </div>
      {#if groupingField === 'fixed'}
        <input
          type="text"
          bind:value={fixedFeatureName}
          placeholder="Feature name"
          class="mt-1 w-full max-w-xs h-[30px] px-2.5 text-[12.5px] rounded-md bg-surface text-ink border border-border hover:border-border-strong focus:border-accent focus:outline-none"
        />
      {/if}
    </fieldset>

    <GroupingTree
      {tree}
      {collisions}
      decisions={effectiveDecisions}
      ondecision={(ref, d) => { decisions = { ...decisions, [ref]: d }; }}
    />

    <form
      action="?/manualCommit"
      method="POST"
      use:enhance={() => {
        error      = null;
        committing = true;
        return async ({ result, update }) => {
          committing = false;
          if (result.type === 'failure' || result.type === 'error') {
            error = failureMessage(result, 'Import failed');
            return;
          }
          if (result.type === 'success' && isCommitted(result.data)) {
            outcome = result.data.manualOutcome;
          }
          await update();
        };
      }}
      class="flex justify-end items-center gap-3 flex-wrap"
    >
      <input type="hidden" name="previewId"        value={parsed.previewId} />
      <input type="hidden" name="groupingField"    value={groupingField} />
      <input type="hidden" name="fixedFeatureName" value={fixedFeatureName} />
      <input type="hidden" name="decisions"        value={JSON.stringify(effectiveDecisions)} />
      <Button type="submit" variant="primary" disabled={committing || keptCount === 0}>
        Import {keptCount} scenario{keptCount === 1 ? '' : 's'}
      </Button>
    </form>
  {/if}

  {#if outcome}
    <div class="bg-surface border border-border rounded-xl px-4 py-3 flex flex-col gap-2">
      <p class="text-[12.5px] font-medium text-ink tabular-nums">
        Imported {outcome.imported}, skipped {outcome.skipped}
      </p>
      {#if outcome.failed.length}
        <ul class="flex flex-col gap-1.5">
          {#each outcome.failed as fail (fail.ref)}
            <li class="rounded-md bg-fail-soft px-2.5 py-1.5 text-[12px] text-fail-ink">
              <span class="font-medium">{fail.name}</span>
              <span class="text-fail-ink/80"> {fail.reason}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  {#if error}
    <p class="text-[12px] text-fail-ink">{error}</p>
  {/if}
</div>
