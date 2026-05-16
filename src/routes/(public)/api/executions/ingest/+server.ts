import { error, json } from '@sveltejs/kit';
import { parseCucumberJson } from '$lib/server/executions/cucumber-json/parse';
import { ingestExecution } from '$lib/server/executions/ingest';
import { resolveCiExecutor } from '$lib/server/executions/auth';
import { readCiMetadata } from '$lib/executions/ci-metadata';
import type { RequestHandler } from './$types';

export const POST = (async (event) => {
  const projectId   = event.request.headers.get('x-project-id') ?? event.url.searchParams.get('project');
  if (!projectId) throw error(400, 'X-Project-Id header (or ?project=) required');

  const environment = event.request.headers.get('x-environment');
  const ciMetadata  = readCiMetadata((name) => event.request.headers.get(name));
  const executedBy  = await resolveCiExecutor(event);

  const payload = await event.request.json().catch(() => null);
  if (payload === null) throw error(400, 'invalid JSON body');

  let parsed;
  try {
    parsed = parseCucumberJson(payload);
  } catch (e) {
    throw error(400, e instanceof Error ? e.message : 'parse failed');
  }

  try {
    const result = await ingestExecution({ projectId, executedBy, environment, ciMetadata, parsed });
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
}) satisfies RequestHandler;
