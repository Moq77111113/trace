import { error } from '@sveltejs/kit';
import { listExecutionsForExport } from '$lib/server/executions/read/queries';
import { parseExecutionFilters } from '$lib/server/executions/read/filters';
import { requireProject } from '$lib/server/projects/authz';
import { EXPORT_ROW_CAP } from '$lib/features/csv-export/lib/csv';
import { parseAggregatedScope } from '$lib/features/print-report/lib/scope';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, url, locals }) => {
  const project = await requireProject(locals.authz, params.slug, 'execution.review');
  const { filters } = parseExecutionFilters(url);
  const rows = await listExecutionsForExport(locals.authz, project.id, filters);

  if (rows.length > EXPORT_ROW_CAP) {
    throw error(413, `Too many rows for export (>${EXPORT_ROW_CAP}). Refine filters.`);
  }

  return {
    project: { name: project.name, slug: project.slug },
    filters,
    rows,
    scope:   parseAggregatedScope(url.searchParams.get('scope')),
  };
}) satisfies PageServerLoad;
