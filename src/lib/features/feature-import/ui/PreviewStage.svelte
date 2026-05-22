<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/shared/ui/Button.svelte';
  import Select from '$lib/shared/ui/Select.svelte';
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import { failureMessage } from '$lib/shared/forms/action-result';
  import { isCommitResult } from '../model/action-results';
  import { useImport } from '../model/context';
  import {
    decisionOptionsFor,
    statusRowClass,
    statusSymbol,
    statusTextClass,
    type Decision,
  } from '../lib/format';
  import type { PreviewRowStatus } from '$lib/server/import/types';

  type Props = { existingGroups: string[] };
  let { existingGroups }: Props = $props();

  const flow = useImport();

  let committing = $state(false);

  const bulkCollisionOptions: { value: Decision; label: string }[] = [
    { value: 'skip',      label: 'Skip all'      },
    { value: 'overwrite', label: 'Overwrite all' },
    { value: 'rename',    label: 'Rename all'    },
  ];

  const bulkParseErrorOptions: { value: Decision; label: string }[] = [
    { value: 'skip',   label: 'Skip all'                  },
    { value: 'import', label: 'Import all (non-runnable)' },
  ];

  function isDecision(v: string): v is Decision {
    return v === 'import' || v === 'skip' || v === 'overwrite' || v === 'rename';
  }

  function isStatus(v: string): v is PreviewRowStatus {
    return v === 'new' || v === 'collision' || v === 'parse-error';
  }

  function rowsAsJson(): string {
    if (!flow.preview) return '{}';
    return JSON.stringify(
      Object.fromEntries(
        flow.preview.rows.map((row) => [
          row.rowId,
          { decision: flow.actions[row.rowId] ?? 'skip', groupName: flow.groups[row.rowId] ?? null },
        ]),
      ),
    );
  }
</script>

{#if flow.preview}
  <header class="flex justify-between items-center text-[12px] mb-3 gap-4 flex-wrap">
    <div class="flex items-center gap-2 flex-wrap">
      <Pill kind="neutral">{flow.preview.summary.total} files</Pill>
      <Pill kind="pass">{flow.preview.summary.new} new</Pill>
      {#if flow.preview.summary.collisions > 0}
        <Pill kind="flake">{flow.preview.summary.collisions} collisions</Pill>
      {/if}
      {#if flow.preview.summary.parseErrors > 0}
        <Pill kind="fail">{flow.preview.summary.parseErrors} parse errors</Pill>
      {/if}
    </div>

    <div class="flex gap-3 items-center flex-wrap">
      {#if flow.preview.summary.collisions > 0}
        <label class="flex items-center gap-2 text-ink-3 text-[12px]">
          <span>Apply to collisions:</span>
          <Select
            value=""
            onValueChange={(v) => { if (isDecision(v)) flow.applyBulk('collision', v); }}
            options={bulkCollisionOptions}
            placeholder="Bulk…"
          />
        </label>
      {/if}

      {#if flow.preview.summary.parseErrors > 0}
        <label class="flex items-center gap-2 text-ink-3 text-[12px]">
          <span>Apply to parse errors:</span>
          <Select
            value=""
            onValueChange={(v) => { if (isDecision(v)) flow.applyBulk('parse-error', v); }}
            options={bulkParseErrorOptions}
            placeholder="Bulk…"
          />
        </label>
      {/if}
    </div>
  </header>

  <datalist id="import-groups">
    {#each existingGroups as name (name)}<option value={name}></option>{/each}
  </datalist>

  <div class="bg-surface border border-border rounded-xl overflow-hidden">
    <div class="grid grid-cols-[32px_1.3fr_1.3fr_80px_1.1fr_1fr_140px] gap-3 px-4 py-2.5 bg-surface-2 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3 border-b border-border">
      <div></div>
      <div>File</div>
      <div>Feature</div>
      <div class="tabular-nums">Scenarios</div>
      <div>Tags</div>
      <div>Group</div>
      <div>Action</div>
    </div>

    {#each flow.preview.rows as row (row.rowId)}
      <div class="grid grid-cols-[32px_1.3fr_1.3fr_80px_1.1fr_1fr_140px] gap-3 px-4 py-3 text-[13px] border-t border-border items-center {statusRowClass(row.status)}">
        <div class="font-mono text-[14px] {statusTextClass(row.status)}">{statusSymbol(row.status)}</div>
        <div class="text-ink truncate font-mono text-[12.5px]">{row.filename}</div>
        <div class="truncate">
          <span class="text-ink font-medium">{row.featureName ?? '—'}</span>
          {#if row.status === 'collision' && row.collidesWithId}
            <span class="text-[10.5px] text-flake-ink ml-1">· exists</span>
          {:else if row.status === 'collision'}
            <span class="text-[10.5px] text-flake-ink ml-1">· duplicate in batch</span>
          {:else if row.status === 'parse-error'}
            <span class="text-[10.5px] text-fail-ink ml-1">· {row.parseErrors.length} parse error{row.parseErrors.length === 1 ? '' : 's'}</span>
          {/if}
        </div>
        <div class="text-ink-3 tabular-nums">{row.status === 'parse-error' ? '—' : row.scenarioCount}</div>
        <div class="text-[11px] font-mono text-ink-3 truncate">
          {row.tags.length ? row.tags.map((t) => `@${t}`).join(' ') : '—'}
        </div>
        <div>
          <input
            type="text"
            list="import-groups"
            value={flow.groups[row.rowId] ?? ''}
            oninput={(e) => flow.setGroup(row.rowId, e.currentTarget.value.trim() || null)}
            placeholder="ungrouped"
            class="w-full h-[30px] px-2.5 text-[12.5px] rounded-md bg-surface text-ink border border-border hover:border-border-strong focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <Select
            value={flow.actions[row.rowId] ?? 'skip'}
            onValueChange={(v) => { if (isDecision(v)) flow.setAction(row.rowId, v); }}
            options={decisionOptionsFor(row.status)}
          />
        </div>
      </div>
    {/each}
  </div>

  <form
    class="mt-4 flex justify-between items-center gap-3 flex-wrap"
    action="?/commit"
    method="POST"
    use:enhance={() => {
      flow.error = null;
      committing  = true;
      return async ({ result }) => {
        committing = false;
        if (result.type === 'failure' || result.type === 'error') {
          flow.error = failureMessage(result, 'Commit failed');
          return;
        }
        if (result.type === 'success' && isCommitResult(result.data)) {
          flow.applyOutcome(result.data.outcome);
        }
      };
    }}
  >
    <input type="hidden" name="previewId" value={flow.preview.previewId}>
    <input type="hidden" name="rows"      value={rowsAsJson()}>

    <span class="text-[12px] text-ink-mute">Per-file commit, atomic per row. Errors don't block others.</span>
    <div class="flex gap-2">
      <Button variant="ghost" type="button" onclick={() => flow.reset()} disabled={committing}>Cancel</Button>
      <Button type="submit" variant="primary" disabled={committing}>
        Import {flow.preview.summary.total} file{flow.preview.summary.total === 1 ? '' : 's'}
      </Button>
    </div>
  </form>

  {#if flow.error}
    <p class="mt-3 text-[12px] text-fail-ink">{flow.error}</p>
  {/if}
{/if}
