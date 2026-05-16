import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';

const builder = new AstBuilder(IdGenerator.uuid());
const matcher = new GherkinClassicTokenMatcher();

export type ScenarioStep = {
  keyword: string;
  text:    string;
  line:    number;
};

export function extractScenarioSteps(content: string, scenarioName: string): ScenarioStep[] {
  if (!content.trim() || !scenarioName) return [];

  let doc;
  try {
    doc = new Parser(builder, matcher).parse(content);
  } catch {
    return [];
  }

  const feature = doc.feature;
  if (!feature) return [];

  const backgroundSteps = collectBackgroundSteps(feature);

  for (const child of feature.children ?? []) {
    if (!child.scenario) continue;
    if (child.scenario.name !== scenarioName) continue;

    const ownSteps = (child.scenario.steps ?? []).map(toStep);
    return [...backgroundSteps, ...ownSteps];
  }

  return [];
}

type FeatureLike = { children?: readonly { background?: { steps?: readonly unknown[] } }[] };

function collectBackgroundSteps(feature: FeatureLike): ScenarioStep[] {
  for (const child of feature.children ?? []) {
    if (!child.background) continue;
    return (child.background.steps ?? []).map(toStep);
  }
  return [];
}

type RawStep = {
  keyword?:  string;
  text?:     string;
  location?: { line?: number };
};

function toStep(raw: unknown): ScenarioStep {
  const r = raw as RawStep;
  return {
    keyword: (r.keyword ?? '').trim(),
    text:    r.text    ?? '',
    line:    r.location?.line ?? 0,
  };
}
