import { describe, it, expect } from 'vitest';
import { groupingOptionCounts } from '$lib/shared/import-manual/grouping';
import type { ImportIR, ImportedScenario } from '$lib/shared/import-manual/ir';

function scn(ref: string, grouping: Partial<ImportedScenario['grouping']>): ImportedScenario {
  return { ref, externalKey: null, name: ref, description: null, steps: [], grouping: { folder: null, component: null, issue: null, ...grouping } };
}

describe('groupingOptionCounts', () => {
  const ir: ImportIR = { sourceId: 'zephyr-atm', scenarios: [
    scn('a', { component: 'Catalog' }), scn('b', { component: 'Catalog' }), scn('c', { component: 'Checkout' }),
  ] };
  const opts = groupingOptionCounts(ir, 'Imported scenarios');

  it('marks folder unavailable and component available', () => {
    expect(opts.find((o) => o.field === 'folder')?.available).toBe(false);
    expect(opts.find((o) => o.field === 'component')?.available).toBe(true);
  });

  it('counts the features each field would produce', () => {
    expect(opts.find((o) => o.field === 'component')?.count).toBe(2);
    expect(opts.find((o) => o.field === 'fixed')?.count).toBe(1);
  });
});
