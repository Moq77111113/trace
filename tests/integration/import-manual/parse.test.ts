// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseManualImport } from '$lib/server/import/manual/parse';
import { getManualPreview } from '$lib/server/import/manual/buffer';
import { mkProject } from '$testing/fixtures';

const bytes = readFileSync(fileURLToPath(new URL('../../fixtures/zephyr/sample.xml', import.meta.url)));

describe('parseManualImport', () => {
  it('detects the adapter, returns IR + guessed grouping + existing corpus, and buffers the IR', async () => {
    const project = await mkProject({ name: `Parse ${Date.now()}-${Math.random()}` });
    const result = await parseManualImport(project.id, { filename: 'sample.xml', bytes });

    expect(result.sourceId).toBe('zephyr-atm');
    expect(result.scenarios).toHaveLength(2);
    expect(result.guessedGroupingField).toBe('component');
    expect(getManualPreview(result.previewId)?.ir.scenarios).toHaveLength(2);
  });

  it('returns an unsupported result for an unknown file', async () => {
    const project = await mkProject({ name: `Parse ${Date.now()}-${Math.random()}` });
    const result = await parseManualImport(project.id, { filename: 'x.txt', bytes: Buffer.from('nope') });
    expect(result.sourceId).toBeNull();
  });
});
