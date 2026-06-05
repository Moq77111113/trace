/** A single ordered step of an imported scenario. */
export type ImportedStep = { action: string; expected: string | null };

/** Candidate grouping values carried per scenario; any may be null. */
export type ImportGrouping = { folder: string | null; component: string | null; issue: string | null };

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

/** Field used to map scenarios onto parent features. `fixed` = one user-named feature. */
export type GroupingField = 'folder' | 'component' | 'issue' | 'fixed';
