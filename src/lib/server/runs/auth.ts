import type { RequestEvent } from '@sveltejs/kit';

/**
 * D1: ingest is open. `executedBy` falls back to the `X-CI-Source` header
 * (default `'ci'`). D2/M6 swaps this for API-key resolution without touching
 * the ingest function signature.
 */
export async function resolveCiExecutor(event: RequestEvent): Promise<string> {
  return event.request.headers.get('x-ci-source')?.trim() || 'ci';
}
