import { describe, it, expect } from 'vitest';
import { buildGroupingTree, guessGroupingField, resolveFeatureName, UNGROUPED_FEATURE } from '$lib/shared/import-manual/grouping';
import type { ImportIR, ImportedScenario } from '$lib/shared/import-manual/ir';

function scn(ref: string, grouping: Partial<ImportedScenario['grouping']>): ImportedScenario {
	return { ref, externalKey: null, name: ref, description: null, steps: [], grouping: { component: null, issue: null, ...grouping } };
}

describe('guessGroupingField', () => {
	it('prefers component when any scenario has one', () => {
		const ir: ImportIR = { sourceId: 'zephyr-atm', scenarios: [scn('a', { component: 'Catalog' })] };
		expect(guessGroupingField(ir)).toBe('component');
	});

	it('falls back to issue when no components exist', () => {
		const ir: ImportIR = { sourceId: 'zephyr-atm', scenarios: [scn('a', { issue: 'Search epic' })] };
		expect(guessGroupingField(ir)).toBe('issue');
	});

	it('falls back to fixed when nothing groups', () => {
		const ir: ImportIR = { sourceId: 'zephyr-atm', scenarios: [scn('a', {})] };
		expect(guessGroupingField(ir)).toBe('fixed');
	});
});

describe('resolveFeatureName', () => {
	it('uses the grouping value for the chosen field', () => {
		expect(resolveFeatureName(scn('a', { component: 'Catalog' }), 'component', '')).toBe('Catalog');
	});

	it('uses the fixed name when field is fixed', () => {
		expect(resolveFeatureName(scn('a', { component: 'Catalog' }), 'fixed', 'Legacy')).toBe('Legacy');
	});

	it('falls back when the chosen field is empty on a scenario', () => {
		expect(resolveFeatureName(scn('a', {}), 'component', '')).toBe(UNGROUPED_FEATURE);
	});
});

describe('buildGroupingTree', () => {
	it('groups scenarios by resolved feature name', () => {
		const ir: ImportIR = { sourceId: 'zephyr-atm', scenarios: [
			scn('a', { component: 'Catalog' }), scn('b', { component: 'Catalog' }), scn('c', { component: 'Checkout' }),
		] };
		const tree = buildGroupingTree(ir, 'component', '');
		const catalog = tree.find((n) => n.featureName === 'Catalog');
		expect(tree).toHaveLength(2);
		expect(catalog?.scenarios.map((s) => s.ref)).toEqual(['a', 'b']);
	});
});
