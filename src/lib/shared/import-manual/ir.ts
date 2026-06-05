/** A single ordered step of an imported scenario. */
export type ImportedStep = { action: string; expected: string | null };

/** Candidate grouping values carried per scenario; any may be null. */
export type ImportGrouping = { component: string | null; issue: string | null };

/** One scenario in the neutral import shape, before it is mapped onto a trace feature. */
export type ImportedScenario = {
	ref: string;
	externalKey: string | null;
	name: string;
	description: string | null;
	steps: ImportedStep[];
	grouping: ImportGrouping;
};

/** Source adapter ids supported by the import pipeline. */
export type SourceId = 'csv' | 'zephyr-atm';

/** Neutral representation every adapter emits; the only contract downstream code depends on. */
export type ImportIR = { sourceId: SourceId; scenarios: ImportedScenario[] };

/** Fields a scenario can be grouped onto a parent feature by. `fixed` = one user-named feature. */
export const GROUPING_FIELDS = ['component', 'issue', 'fixed'] as const;

/** Field used to map scenarios onto parent features. */
export type GroupingField = (typeof GROUPING_FIELDS)[number];

/** Per-scenario import decisions. `overwrite` is intentionally excluded for v1. */
export const SCENARIO_DECISIONS = ['import', 'skip', 'rename'] as const;

/** What to do with one scenario at commit time. */
export type ScenarioDecision = (typeof SCENARIO_DECISIONS)[number];
