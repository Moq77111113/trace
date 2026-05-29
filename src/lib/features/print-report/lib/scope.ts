export type RunScope = 'full' | 'failed';
export type AggregatedScope = 'full' | 'failed';
export type CampaignScope = 'full' | 'required' | 'failed';

const RUN: ReadonlySet<RunScope> = new Set(['full', 'failed']);
const AGG: ReadonlySet<AggregatedScope> = new Set(['full', 'failed']);
const CAMPAIGN: ReadonlySet<CampaignScope> = new Set(['full', 'required', 'failed']);

export function parseRunScope(value: string | null | undefined): RunScope {
	return value && RUN.has(value as RunScope) ? (value as RunScope) : 'full';
}

export function parseAggregatedScope(value: string | null | undefined): AggregatedScope {
	return value && AGG.has(value as AggregatedScope) ? (value as AggregatedScope) : 'full';
}

export function parseCampaignScope(value: string | null | undefined): CampaignScope {
	return value && CAMPAIGN.has(value as CampaignScope) ? (value as CampaignScope) : 'full';
}
