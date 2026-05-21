import { error } from '@sveltejs/kit';
import { listExecutionsForExport } from '$lib/server/executions/read/queries';
import { parseExecutionFilters } from '$lib/server/executions/read/filters';
import { getProjectIdBySlug } from '$lib/server/projects/queries';
import { EXPORT_ROW_CAP, executionsCsvFilename, toExecutionsCsv } from '$lib/features/csv-export/lib/csv';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
  const projectId = await getProjectIdBySlug(params.slug);
  if (!projectId) throw error(404, 'Project not found');

  const { filters } = parseExecutionFilters(url);
  const rows = await listExecutionsForExport(projectId, filters);

  if (rows.length > EXPORT_ROW_CAP) {
    throw error(413, `Too many rows for export (>${EXPORT_ROW_CAP}). Refine filters.`);
  }

  const body = toExecutionsCsv(rows);

  return new Response(body, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${executionsCsvFilename()}"`,
      'Cache-Control':       'no-store',
    },
  });
};
