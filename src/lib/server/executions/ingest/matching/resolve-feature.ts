import { ok, err } from '$lib/shared/lib/result';
import { formatTraceTag } from '$lib/features/feature-import/lib/trace-tag';
import { matchByCodeTag } from './strategies/code-tag';
import { matchByGherkinName } from './strategies/gherkin-name';
import { matchByName } from './strategies/name';
import type { ResolveResult } from './match-result';

type ParsedFeatureLike = { featureName: string; tags: string[] };

export async function resolveFeature(parsed: ParsedFeatureLike, projectId: string): Promise<ResolveResult> {
	const byTag = await matchByCodeTag(parsed.tags, projectId);
	if (byTag.kind === 'matched') return ok({ feature: byTag.feature, via: 'code' });
	if (byTag.kind === 'missing-code') {
		return err({
			code: 'MATCH_TAG_REFERENCES_MISSING_CODE',
			detail: `tagged '${formatTraceTag(byTag.code)}' but no such feature exists`,
			tagCode: byTag.code,
		});
	}

	const byGherkin = await matchByGherkinName(parsed.featureName, projectId);
	if (byGherkin) return ok({ feature: byGherkin, via: 'gherkin-name' });

	const byName = await matchByName(parsed.featureName, projectId);
	if (byName) return ok({ feature: byName, via: 'name' });

	return err({ code: 'MATCH_NO_STRATEGY_HIT', detail: `no feature matches '${parsed.featureName}'` });
}
