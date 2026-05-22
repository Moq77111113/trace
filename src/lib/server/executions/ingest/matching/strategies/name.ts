import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { features } from '$lib/server/db/schema';
import type { Feature } from '../match-result';

export async function matchByName(featureName: string, projectId: string): Promise<Feature | null> {
	const [row] = await db
		.select()
		.from(features)
		.where(
			and(
				eq(features.projectId, projectId),
				eq(features.archived, false),
				sql`LOWER(${features.name}) = LOWER(${featureName})`,
			),
		);
	return row ?? null;
}
