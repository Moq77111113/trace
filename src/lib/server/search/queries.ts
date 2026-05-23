import { and, asc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { featureGroups, features, projects, executions } from '$lib/server/db/schema';

export type SearchResult = {
	featureId:   string;
	featureName: string;
	featureCode: string;
	projectId:   string;
	projectSlug: string;
	projectName: string;
	groupName:   string | null;
	status:      typeof executions.status.enumValues[number] | null;
};

const LIMIT = 20;

/** Search non-archived features within `accessibleProjectIds` by name or feature code (case-insensitive). */
export async function searchFeatures(query: string, accessibleProjectIds: Set<string>): Promise<SearchResult[]> {
	const trimmed = query.trim();
	if (!trimmed || accessibleProjectIds.size === 0) return [];

	const featureCodeSql = sql<string>`${projects.codePrefix} || '-' || ${features.codeSeq}`;
	const needle = `%${trimmed}%`;

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
			featureCode: featureCodeSql,
			projectId:   projects.id,
			projectSlug: projects.slug,
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
				inArray(projects.id, [...accessibleProjectIds]),
				or(ilike(features.name, needle), ilike(featureCodeSql, needle))
			)
		)
		.orderBy(asc(features.name))
		.limit(LIMIT);
}
