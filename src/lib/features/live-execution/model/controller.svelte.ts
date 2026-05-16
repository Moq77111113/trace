import type { ExecutionPageData } from '$lib/server/executions/queries';
import { createExecutionApi, type ExecutionApi } from '../api/client';
import { ScenarioSelection }    from './selection.svelte';
import { ScenarioMarking }      from './marking.svelte';
import { NotesEditor }          from './notes-editor.svelte';
import { AttachmentsUploader }  from './attachments-uploader.svelte';
import { TerminalFlow }         from './terminal-flow.svelte';

type RunData = NonNullable<ExecutionPageData>;

export function createLiveExecutionController(
  data: RunData,
  api: ExecutionApi = createExecutionApi(data.execution.id),
) {
  const selection   = new ScenarioSelection(data.scenarios);
  const marking     = new ScenarioMarking(selection, api);
  const notes       = new NotesEditor(api, data.execution.notes ?? '');
  const attachments = new AttachmentsUploader(selection, api);
  const terminal    = new TerminalFlow(selection, api);

  return { selection, marking, notes, attachments, terminal };
}

export type LiveExecutionController = ReturnType<typeof createLiveExecutionController>;
