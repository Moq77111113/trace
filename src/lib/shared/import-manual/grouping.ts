import type { GroupingField, ImportIR, ImportedScenario } from './ir';

/** Feature name used when a scenario has no value for the chosen grouping field. */
export const FALLBACK_FEATURE = 'Imported scenarios';

/** Pick the grouping field with the best coverage: folder, then component, then issue, else fixed. */
export function guessGroupingField(ir: ImportIR): GroupingField {
	const has = (f: 'folder' | 'component' | 'issue') => ir.scenarios.some((s) => s.grouping[f]);
	if (has('folder')) return 'folder';
	if (has('component')) return 'component';
	if (has('issue')) return 'issue';
	return 'fixed';
}

/** Resolve the parent feature name for one scenario under the chosen grouping field. */
export function resolveFeatureName(scenario: ImportedScenario, field: GroupingField, fixedName: string): string {
	const fallback = fixedName.trim() || FALLBACK_FEATURE;
	if (field === 'fixed') return fallback;
	return scenario.grouping[field]?.trim() || fallback;
}

/** One parent feature and the scenarios that land under it. */
export type GroupingNode = { featureName: string; scenarios: ImportedScenario[] };

/** Group all scenarios into parent-feature buckets for the chosen field. */
export function buildGroupingTree(ir: ImportIR, field: GroupingField, fixedName: string): GroupingNode[] {
	const byName = new Map<string, ImportedScenario[]>();
	for (const scenario of ir.scenarios) {
		const key = resolveFeatureName(scenario, field, fixedName);
		const bucket = byName.get(key) ?? [];
		bucket.push(scenario);
		byName.set(key, bucket);
	}
	return [...byName].map(([featureName, scenarios]) => ({ featureName, scenarios }));
}
