import { error } from '@sveltejs/kit';
import { listExecutionsForExport } from '$lib/server/executions/read/queries';
import { parseExecutionFilters } from '$lib/server/executions/read/filters';
import { requireProject } from '$lib/server/projects/authz';
import { visibleFeatureIds } from '$lib/server/features/authz';
import { EXPORT_ROW_CAP, executionsCsvFilename, toExecutionsCsv } from '$lib/features/csv-export/lib/csv';
import { authedHandler } from '$lib/server/route';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = authedHandler(async ({ params, url, locals }) => {
  const project = await requireProject(locals.authz, params.slug, 'execution.review');
  const { filters } = parseExecutionFilters(url);
  const visible = await visibleFeatureIds(locals.authz, project.id, 'execution.review');
  const rows = await listExecutionsForExport(project.id, visible, filters);

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
});
