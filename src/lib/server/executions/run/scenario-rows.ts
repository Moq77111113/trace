type ScenarioSource = 'GHERKIN' | 'MANUAL';

export type FrozenStep = {
  keyword:  string | null;
  text:     string;
  expected: string | null;
};

export type ScenarioRowInput = {
  scenarioName: string;
  source:       ScenarioSource;
  steps:        FrozenStep[];
};

export type ScenarioRow = ScenarioRowInput & { position: number };

/** Renumbers positions from 1 within each source section; steps ride along untouched. */
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

export type FrozenStepRow = FrozenStep & {
  scenarioResultId: string;
  position:         number;
  verdict:          'PENDING';
};

/** Numbers a scenario's steps from 1 and pins each to its scenario result id, frozen as PENDING. */
export function buildStepRows(scenarioResultId: string, steps: FrozenStep[]): FrozenStepRow[] {
  return steps.map((st, i) => ({
    scenarioResultId,
    position: i + 1,
    keyword:  st.keyword,
    text:     st.text,
    expected: st.expected,
    verdict:  'PENDING' as const,
  }));
}
