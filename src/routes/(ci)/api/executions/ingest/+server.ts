import { error, json } from '@sveltejs/kit';
import { parseCucumberJson } from '$lib/server/executions/ingest/cucumber-json/parse';
import { ingestRun } from '$lib/server/executions/ingest/pipeline';
import { readCiMetadata } from '$lib/entities/execution/lib/ci-metadata';
import { ciHandler, CI_HTTP_MAPPING, type CiHttpErrorCode } from '$lib/server/route';
import type { RequestHandler } from './$types';

function throwHttp(code: CiHttpErrorCode): never {
  const http = CI_HTTP_MAPPING[code];
  throw error(http.status, { code, message: http.message });
}

export const POST: RequestHandler = ciHandler(async (event, { executor, projectId }) => {
  const environment = event.request.headers.get('x-environment');
  const ciMetadata  = readCiMetadata((name) => event.request.headers.get(name));
  const campaignId  = event.request.headers.get('x-ci-campaign-id');

  let payload: unknown;
  try {
    payload = await event.request.json();
  } catch {
    throwHttp('PARSE_INVALID_JSON');
  }

  const parsed = parseCucumberJson(payload);
  if (!parsed.ok) throwHttp(parsed.error.code);

  const result = await ingestRun({
    projectId,
    executedBy:  executor,
    environment,
    ciMetadata,
    campaignId,
    parsed:      parsed.value,
  });
  if (!result.ok) throwHttp(result.error.code);

  const status = result.value.unknownFeatures.length === 0 ? 200 : 207;

  return json({
    status:           result.value.status,
    executions:       result.value.executions.map((e) => ({
      feature_code:      e.featureCode,
      execution_id:      e.executionId,
      status:            e.status,
      scenarios_matched: e.scenariosMatched,
      matched_via:       e.matchedVia,
    })),
    unknown_features: result.value.unknownFeatures,
    warnings:         result.value.warnings,
  }, { status });
});
