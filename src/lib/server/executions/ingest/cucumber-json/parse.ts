import { z } from 'zod';
import { ok, err, type Result } from '$lib/shared/lib/result';
import type { IngestedFeatureRun, IngestedScenario } from './types';

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

const cucumberTag = z.object({ name: z.string() });

const cucumberFeature = z.object({
  id:       z.string(),
  name:     z.string().min(1),
  tags:     z.array(cucumberTag).default([]),
  elements: z.array(cucumberElement).default([]),
});

const cucumberPayload = z.array(cucumberFeature);

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

export type ParseErrorCode =
  | 'PARSE_EMPTY_PAYLOAD'
  | 'PARSE_INVALID_JSON'
  | 'PARSE_SCHEMA_INVALID';

export type ParseError = { code: ParseErrorCode; detail: string };

export function parseCucumberJson(payload: unknown): Result<IngestedFeatureRun[], ParseError> {
  const parsed = cucumberPayload.safeParse(payload);
  if (!parsed.success) {
    return err({ code: 'PARSE_SCHEMA_INVALID', detail: parsed.error.issues.map((i) => i.message).join('; ') });
  }
  if (parsed.data.length === 0) {
    return err({ code: 'PARSE_EMPTY_PAYLOAD', detail: 'cucumber.json: no features in payload' });
  }

  const runs: IngestedFeatureRun[] = parsed.data.map((feature) => {
    const scenarios: IngestedScenario[] = feature.elements
      .filter((el) => el.type === 'scenario')
      .map((el) => ({
        name:         el.name,
        status:       deriveScenarioStatus(el.steps),
        durationMs:   totalDurationMs(el.steps),
        logs:         null,
        errorMessage: errorFromSteps(el.steps),
      }));

    const warnings: string[] = [];
    if (scenarios.length === 0) {
      warnings.push(`Cucumber feature '${feature.name}' has no scenarios — execution recorded with status SKIPPED.`);
    }

    return {
      featureName: feature.name,
      tags:        feature.tags.map((t) => t.name),
      scenarios,
      warnings,
    };
  });

  return ok(runs);
}
