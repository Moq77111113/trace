import { error, json } from '@sveltejs/kit';
import { parseCucumberJson } from '$lib/server/executions/ingest/cucumber-json/parse';
import { ingestExecution } from '$lib/server/executions/ingest/pipeline';
import { readCiMetadata } from '$lib/entities/execution/lib/ci-metadata';
import { ciHandler } from '$lib/server/route';
import type { RequestHandler } from './$types';

export type IngestSuccess = {
  run_id:            string;
  status:            string;
  scenarios_matched: number;
  scenarios_unknown: string[];
  warnings:          string[];
};

export const POST: RequestHandler = ciHandler(async (event, { executor, projectId }) => {
  const environment = event.request.headers.get('x-environment');
  const featureCode = event.request.headers.get('x-ci-feature-code');
  const ciMetadata  = readCiMetadata((name) => event.request.headers.get(name));

  const payload = await event.request.json().catch(() => null);
  if (payload === null) throw error(400, 'invalid JSON body');

  let parsed;
  try {
    parsed = parseCucumberJson(payload);
  } catch (e) {
    throw error(400, e instanceof Error ? e.message : 'parse failed');
  }

  try {
    const result = await ingestExecution({ projectId, executedBy: executor, environment, featureCode, ciMetadata, parsed });
    return json({
      run_id:            result.execution.id,
      status:            result.execution.status,
      scenarios_matched: result.scenariosMatched,
      scenarios_unknown: result.scenariosUnknown,
      warnings:          result.warnings,
    }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'ingest failed';
    if (/no feature matching/i.test(message)) throw error(404, message);
    throw error(500, message);
  }
});
