import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import GroupingTree from '$lib/features/import-manual/ui/GroupingTree.svelte';
import type { GroupingNode } from '$lib/shared/import-manual/grouping';
import type { ImportedScenario } from '$lib/shared/import-manual/ir';

function scn(ref: string, name: string): ImportedScenario {
  return { ref, externalKey: ref, name, description: null, steps: [{ action: 'a', expected: null }], grouping: { folder: null, component: null, issue: null } };
}

describe('GroupingTree', () => {
  const tree: GroupingNode[] = [{ featureName: 'Catalog', scenarios: [scn('k1', 'Search returns results'), scn('k2', 'Other')] }];

  it('renders one feature node with its scenarios', () => {
    const { getByText } = render(GroupingTree, { props: { tree, collisions: new Map([['k1', false], ['k2', false]]) } });
    expect(getByText('Catalog')).toBeInTheDocument();
    expect(getByText('Search returns results')).toBeInTheDocument();
  });

  it('shows a collision badge on a colliding scenario', () => {
    const { getByText } = render(GroupingTree, { props: { tree, collisions: new Map([['k1', true], ['k2', false]]) } });
    expect(getByText(/already exists/i)).toBeInTheDocument();
  });
});
