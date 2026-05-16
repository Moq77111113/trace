import { and, asc, eq, ilike, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { featureGroups, features, projects, executions } from '$lib/server/db/schema';

export type SearchResult = {
	featureId:   string;
	featureName: string;
	projectId:   string;
	projectName: string;
	groupName:   string | null;
	status:      typeof executions.status.enumValues[number] | null;
};

const LIMIT = 20;

/** Search non-archived features across all non-archived projects by name (case-insensitive). */
export async function searchFeatures(query: string): Promise<SearchResult[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	const ranked = db.$with('ranked_runs').as(
		db
			.select({
				featureId:  executions.featureId,
				status:     executions.status,
				finishedAt: executions.finishedAt,
				rn:         sql<number>`ROW_NUMBER() OVER (
					PARTITION BY ${executions.featureId}
					ORDER BY ${executions.finishedAt} DESC NULLS LAST
				)`.as('rn')
			})
			.from(executions)
			.where(ne(executions.status, 'IN_PROGRESS'))
	);

	return db
		.with(ranked)
		.select({
			featureId:   features.id,
			featureName: features.name,
			projectId:   projects.id,
			projectName: projects.name,
			groupName:   featureGroups.name,
			status:      ranked.status
		})
		.from(features)
		.innerJoin(projects,      eq(projects.id, features.projectId))
		.leftJoin(featureGroups,  eq(featureGroups.id, features.groupId))
		.leftJoin(ranked,         and(eq(ranked.featureId, features.id), eq(ranked.rn, 1)))
		.where(
			and(
				eq(features.archived, false),
				eq(projects.archived, false),
				ilike(features.name, `%${trimmed}%`)
			)
		)
		.orderBy(asc(features.name))
		.limit(LIMIT);
}
