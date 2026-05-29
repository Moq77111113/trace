import type { ScenarioResultStep } from '$lib/server/db/schema';

type ScenarioSource = 'GHERKIN' | 'MANUAL';

export type ScenarioRowInput = {
  scenarioName: string;
  source:       ScenarioSource;
  steps:        ScenarioResultStep[];
};

export type ScenarioRow = ScenarioRowInput & { position: number };

/**
 * Renumbers positions starting at 1 within each `source` section and carries the
 * frozen step list through untouched. The unique constraint on
 * `(executionId, source, position)` requires per-source contiguous positions;
 * this pure shaper enforces it.
 */
export function buildScenarioRows(items: ScenarioRowInput[]): ScenarioRow[] {
  let gherkinPos = 0;
  let manualPos  = 0;
  return items.map((it) => ({
    scenarioName: it.scenarioName,
    source:       it.source,
    steps:        it.steps,
    position:     it.source === 'GHERKIN' ? ++gherkinPos : ++manualPos,
  }));
}
