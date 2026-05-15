import { z } from 'zod';
import type { IngestedRun, IngestedScenario } from './types';

const NANOSECONDS_PER_MS = 1_000_000;

const cucumberStepStatus = z.enum(['passed', 'failed', 'skipped', 'pending', 'undefined', 'ambiguous']);

const cucumberStep = z.object({
  name:    z.string(),
  result:  z.object({
    status:        cucumberStepStatus,
    duration:      z.number().nonnegative().optional(),
    error_message: z.string().optional(),
  }).optional(),
});

const cucumberElement = z.object({
  id:    z.string(),
  name:  z.string(),
  type:  z.string(),
  steps: z.array(cucumberStep).default([]),
});

const cucumberFeature = z.object({
  id:       z.string(),
  name:     z.string(),
  elements: z.array(cucumberElement).default([]),
});

const cucumberPayload = z.array(cucumberFeature).nonempty('cucumber.json: no features in payload');

type Step = z.infer<typeof cucumberStep>;

function deriveScenarioStatus(steps: Step[]): 'PASSED' | 'FAILED' | 'SKIPPED' {
  if (steps.some((s) => s.result?.status === 'failed')) return 'FAILED';
  if (steps.some((s) => s.result?.status === 'passed')) return 'PASSED';

  return 'SKIPPED';
}

function totalDurationMs(steps: Step[]): number | null {
  const totalNs = steps.reduce((acc, s) => acc + (s.result?.duration ?? 0), 0);

  return totalNs > 0 ? Math.round(totalNs / NANOSECONDS_PER_MS) : null;
}

function errorFromSteps(steps: Step[]): string | null {
  return steps.find((s) => s.result?.error_message)?.result?.error_message ?? null;
}

export function parseCucumberJson(payload: unknown): IngestedRun {
  const parsed = cucumberPayload.safeParse(payload);

  if (!parsed.success) throw new Error(`cucumber.json: ${parsed.error.issues.map((i) => i.message).join('; ')}`);

  const [head, ...rest] = parsed.data;

  if (!head) throw new Error('cucumber.json: no features in payload');
  if (!head.name.trim()) throw new Error('cucumber.json: feature name missing');

  const scenarios: IngestedScenario[] = head.elements
    .filter((el) => el.type === 'scenario')
    .map((el) => ({
      name:         el.name,
      status:       deriveScenarioStatus(el.steps),
      durationMs:   totalDurationMs(el.steps),
      logs:         null,
      errorMessage: errorFromSteps(el.steps),
    }));

  const warnings: string[] = [];

  if (rest.length) warnings.push(`ingest accepts one feature per request; ${rest.length} ignored`);

  return {
    featureName:  head.name,
    scenarios,
    unknownCount: 0,
    warnings,
  };
}
