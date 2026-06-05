import { randomUUID } from 'node:crypto';
import { guessGroupingField } from '$lib/shared/import-manual/grouping';
import type { GroupingField, ImportedScenario, SourceId } from '$lib/shared/import-manual/ir';
import { detectAdapter } from './adapters/registry';
import type { SourceFile } from './adapters/zephyr-atm';
import { existingCorpus } from './existing';
import { putManualPreview } from './buffer';

/** Result of parsing an uploaded file: the IR for the client plus preview metadata. */
export type ParseResult = {
  previewId:            string;
  sourceId:             SourceId | null;
  scenarios:            ImportedScenario[];
  guessedGroupingField: GroupingField;
  existing:             [string, string[]][];
};

/** Detect the adapter for a file, parse it to IR, buffer it, and return everything the preview UI needs. */
export async function parseManualImport(projectId: string, file: SourceFile): Promise<ParseResult> {
  const adapter = detectAdapter(file);
  if (!adapter) {
    return { previewId: '', sourceId: null, scenarios: [], guessedGroupingField: 'fixed', existing: [] };
  }

  const ir = adapter.parse(file);
  const previewId = randomUUID();
  putManualPreview(previewId, projectId, ir);

  const corpus = await existingCorpus(projectId);
  const existing: [string, string[]][] = [...corpus].map(([name, set]) => [name, [...set]]);

  return {
    previewId,
    sourceId:             ir.sourceId,
    scenarios:            ir.scenarios,
    guessedGroupingField: guessGroupingField(ir),
    existing,
  };
}
