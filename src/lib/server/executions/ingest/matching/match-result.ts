import type { InferSelectModel } from 'drizzle-orm';
import type { features } from '$lib/server/db/schema';
import type { Result } from '$lib/shared/lib/result';

export type Feature = InferSelectModel<typeof features>;

export type MatchedVia = 'code' | 'gherkin-name' | 'name';

export type ResolveErrorCode =
	| 'MATCH_NO_STRATEGY_HIT'
	| 'MATCH_TAG_REFERENCES_MISSING_CODE';

export type ResolveError = { code: ResolveErrorCode; detail: string; tagCode?: string };

export type MatchedFeature = { feature: Feature; via: MatchedVia };

export type ResolveResult = Result<MatchedFeature, ResolveError>;
