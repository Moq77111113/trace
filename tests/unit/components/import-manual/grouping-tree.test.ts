import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import GroupingTree from '$lib/features/import-manual/ui/GroupingTree.svelte';
import type { GroupingNode } from '$lib/shared/import-manual/grouping';
import type { ImportedScenario } from '$lib/shared/import-manual/ir';

function scn(ref: string, name: string): ImportedScenario {
  return { ref, externalKey: ref, name, description: null, steps: [{ action: 'Open the storefront', expected: 'The home page loads' }], grouping: { folder: null, component: null, issue: null } };
}

describe('GroupingTree', () => {
  const tree: GroupingNode[] = [{ featureName: 'Catalog', scenarios: [scn('k1', 'Search returns results'), scn('k2', 'Other')] }];

  it('renders one feature node with its scenarios', () => {
    const { getByText } = render(GroupingTree, { props: { tree, collisions: new Map([['k1', false], ['k2', false]]), decisions: { k1: 'import', k2: 'import' }, ondecision: () => {} } });
    expect(getByText('Catalog')).toBeInTheDocument();
    expect(getByText('Search returns results')).toBeInTheDocument();
  });

  it('renders each step action and expected', () => {
    const { getAllByText } = render(GroupingTree, { props: { tree, collisions: new Map([['k1', false], ['k2', false]]), decisions: { k1: 'import', k2: 'import' }, ondecision: () => {} } });
    expect(getAllByText('Open the storefront').length).toBeGreaterThan(0);
    expect(getAllByText(/The home page loads/).length).toBeGreaterThan(0);
  });

  it('shows a totals line for features, scenarios and steps', () => {
    const { getByText } = render(GroupingTree, { props: { tree, collisions: new Map([['k1', false], ['k2', false]]), decisions: { k1: 'import', k2: 'import' }, ondecision: () => {} } });
    expect(getByText(/1 feature · 2 scenarios · 2 steps/)).toBeInTheDocument();
  });

  it('shows a collision badge on a colliding scenario', () => {
    const { getByText } = render(GroupingTree, { props: { tree, collisions: new Map([['k1', true], ['k2', false]]), decisions: { k1: 'rename', k2: 'import' }, ondecision: () => {} } });
    expect(getByText(/already exists/i)).toBeInTheDocument();
  });

  it('reflects the effective decision in each row select', () => {
    const { getAllByRole } = render(GroupingTree, { props: { tree, collisions: new Map([['k1', false], ['k2', false]]), decisions: { k1: 'skip', k2: 'import' }, ondecision: () => {} } });
    const [first, second] = getAllByRole('combobox') as HTMLSelectElement[];
    expect(first?.value).toBe('skip');
    expect(second?.value).toBe('import');
  });

  it('calls ondecision with the ref and the new value on change', async () => {
    const ondecision = vi.fn();
    const { getAllByRole } = render(GroupingTree, { props: { tree, collisions: new Map([['k1', false], ['k2', false]]), decisions: { k1: 'import', k2: 'import' }, ondecision } });
    const [first] = getAllByRole('combobox') as HTMLSelectElement[];
    if (!first) throw new Error('expected a decision select');
    await fireEvent.change(first, { target: { value: 'skip' } });
    expect(ondecision).toHaveBeenCalledWith('k1', 'skip');
  });
});
