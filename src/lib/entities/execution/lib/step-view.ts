/**
 * The render contract for a single step row, deliberately widened to absorb both
 * sources: parsed gherkin steps (keyword set, no expected) and frozen manual steps
 * (keyword null, expected optional). `ScenarioStep` and `ScenarioResultStep` both
 * structurally satisfy it.
 */
export type StepView = {
  keyword:   string | null;
  text:      string;
  expected?: string | null;
};
