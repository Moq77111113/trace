import { describe, it, expect } from 'vitest';
import { markCollisions } from '$lib/shared/import-manual/collisions';
import type { GroupingNode } from '$lib/shared/import-manual/grouping';
import type { ImportedScenario } from '$lib/shared/import-manual/ir';

function scn(ref: string, name: string): ImportedScenario {
  return { ref, externalKey: null, name, description: null, steps: [], grouping: { component: null, issue: null } };
}

describe('markCollisions', () => {
  const tree: GroupingNode[] = [{ featureName: 'Catalog', scenarios: [scn('a', 'Search returns results'), scn('b', 'New one')] }];
  const existing = new Map([['catalog', new Set(['search returns results'])]]);

  it('flags a scenario whose name already exists in the target feature (case-insensitive)', () => {
    const marked = markCollisions(tree, existing);
    expect(marked.get('a')).toBe(true);
    expect(marked.get('b')).toBe(false);
  });

  it('reports no collision when the target feature does not exist yet', () => {
    const marked = markCollisions([{ featureName: 'Brand new', scenarios: [scn('a', 'X')] }], existing);
    expect(marked.get('a')).toBe(false);
  });
});
