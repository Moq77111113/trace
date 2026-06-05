// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseManualImport } from '$lib/server/import/manual/parse';
import { commitManualImport } from '$lib/server/import/manual/commit';
import { getManualPreview } from '$lib/server/import/manual/buffer';
import { mkProject } from '$testing/fixtures';

const bytes = readFileSync(fileURLToPath(new URL('../../fixtures/zephyr/sample.xml', import.meta.url)));

describe('manual import preview→commit pipeline', () => {
  it('parses then commits the buffered IR with a grouping choice', async () => {
    const project = await mkProject({ name: `Route ${Date.now()}-${Math.random()}` });
    const preview = await parseManualImport(project.id, { filename: 'sample.xml', bytes });
    const buffered = getManualPreview(preview.previewId);
    if (!buffered) throw new Error('expected the preview to be buffered');

    const outcome = await commitManualImport({
      projectId: project.id,
      ir: buffered.ir,
      groupingField: preview.guessedGroupingField,
      decisions: {},
    });
    expect(outcome.imported).toBe(2);
  });
});
