import { db } from '$lib/server/db/client';
import { campaigns, campaignFeatures, executions, scenarioResults, scenarioResultSteps } from '$lib/server/db/schema';
import { extractScenarioSteps } from '$lib/shared/gherkin/steps';
import campaignsFileJson from './demo/campaigns.json';

const DAY_MS = 86_400_000;

type ExecutionStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'IN_PROGRESS' | 'ABORTED';
type ScenarioStatus  = 'PASSED' | 'FAILED' | 'SKIPPED' | 'PENDING';

type MemberExecution = {
	source:        'MANUAL' | 'CI';
	status:        Extract<ExecutionStatus, 'PASSED' | 'FAILED' | 'SKIPPED'>;
	executedBy:    string;
	environment:   string | null;
	daysAgo:       number;
	errorMessage?: string;
};

type CampaignMember = {
	featureFile: string;
	required:    boolean;
	position:    number;
	execution:   MemberExecution | null;
};

type CampaignSeed = {
	name:          string;
	appVersion:    string;
	status:        'OPEN' | 'CLOSED';
	outcome?:      'PASSED' | 'FAILED' | 'INCONCLUSIVE';
	closedDaysAgo?: number;
	createdBy:     string;
	closedBy?:     string;
	members:       CampaignMember[];
};

/**
 * Parses the first `Scenario:` line out of a Gherkin feature body.
 * Returns a generic fallback when the file has no scenario header.
 */
function firstScenarioName(featureContent: string): string {
	for (const raw of featureContent.split('\n')) {
		const line = raw.trim();
		if (line.startsWith('Scenario:')) return line.slice('Scenario:'.length).trim();
	}
	return 'Demo scenario';
}

function executionStatusToScenarioStatus(status: MemberExecution['status']): ScenarioStatus {
	if (status === 'PASSED')  return 'PASSED';
	if (status === 'FAILED')  return 'FAILED';
	return 'SKIPPED';
}

/**
 * Inserts the demo campaigns (with members, executions, scenario results) under `projectId`,
 * resolving each member's feature via `featureIdByFilename` and reading content via `readFeature`.
 * Idempotency is the caller's concern — `seedDemoProject` already short-circuits when the demo exists.
 */
export async function seedDemoCampaigns(
	projectId:           string,
	featureIdByFilename: Map<string, string>,
	readFeature:         (filename: string) => string,
	now:                 Date = new Date(),
): Promise<void> {
	const campaignSeeds = campaignsFileJson as CampaignSeed[];
	const nowMs = now.getTime();

	for (const seed of campaignSeeds) {
		const closedAt = seed.status === 'CLOSED' && seed.closedDaysAgo !== undefined
			? new Date(nowMs - seed.closedDaysAgo * DAY_MS)
			: null;

		const [campaign] = await db
			.insert(campaigns)
			.values({
				projectId,
				name:       seed.name,
				appVersion: seed.appVersion,
				status:     seed.status,
				outcome:    seed.outcome ?? null,
				closedAt,
				closedBy:   seed.closedBy ?? null,
				createdBy:  seed.createdBy,
			})
			.returning();
		if (!campaign) throw new Error(`demo seed: campaign insert failed (${seed.name})`);

		for (const member of seed.members) {
			const featureId = featureIdByFilename.get(member.featureFile);
			if (!featureId) throw new Error(`demo seed: campaign member targets missing feature ${member.featureFile}`);

			await db.insert(campaignFeatures).values({
				campaignId: campaign.id,
				featureId,
				required:   member.required,
				position:   member.position,
			});

			if (!member.execution) continue;

			const exec = member.execution;
			const startedAt = new Date(nowMs - exec.daysAgo * DAY_MS);
			const content   = readFeature(member.featureFile);

			const [run] = await db
				.insert(executions)
				.values({
					featureId,
					source:                exec.source,
					executedBy:            exec.executedBy,
					environment:           exec.environment,
					featureContentAtStart: content,
					status:                exec.status,
					startedAt,
					finishedAt:            startedAt,
					campaignId:            campaign.id,
				})
				.returning();
			if (!run) throw new Error(`demo seed: campaign run insert failed (${seed.name} / ${member.featureFile})`);

			const status = executionStatusToScenarioStatus(exec.status);
			const [scRow] = await db.insert(scenarioResults).values({
				executionId:  run.id,
				scenarioName: firstScenarioName(content),
				position:     1,
				status,
				errorMessage: exec.errorMessage ?? null,
			}).returning({ id: scenarioResults.id });
			if (!scRow) throw new Error('demo seed: campaign scenario insert failed');
			const stepRows = extractScenarioSteps(content, firstScenarioName(content)).map((st, j) => ({
				scenarioResultId: scRow.id, position: j + 1, keyword: st.keyword, text: st.text, expected: null, verdict: status,
			}));
			if (stepRows.length > 0) await db.insert(scenarioResultSteps).values(stepRows);
		}
	}
}
