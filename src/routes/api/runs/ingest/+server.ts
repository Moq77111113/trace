import { error, json } from '@sveltejs/kit';
import { parseCucumberJson } from '$lib/server/runs/cucumber-json/parse';
import { ingestRun } from '$lib/server/runs/ingest';
import { resolveCiExecutor } from '$lib/server/runs/auth';
import type { RequestHandler } from './$types';

export const POST = (async (event) => {
  const projectId   = event.request.headers.get('x-project-id') ?? event.url.searchParams.get('project');
  if (!projectId) throw error(400, 'X-Project-Id header (or ?project=) required');

  const environment = event.request.headers.get('x-environment');
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
    const result = await ingestRun({ projectId, executedBy, environment, parsed });
    return json({
      run_id:            result.run.id,
      status:            result.run.status,
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
