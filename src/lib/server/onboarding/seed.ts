import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import {
	projects,
	featureGroups,
	features,
	manualScenarios,
	manualScenarioSteps,
	executions,
	scenarioResults,
	scenarioResultSteps,
} from '$lib/server/db/schema';
import { createProject } from '$lib/server/projects/create';
import { grantAnyUserBlanket } from '$lib/server/authz/seed';
import { allocateCodeSeq } from '$lib/server/features/internal/code-seq';
import { extractScenarioSteps } from '$lib/shared/gherkin/steps';
import projectFileJson from './demo/project.json';
import groupsFileJson from './demo/groups.json';
import featuresMetaJson from './demo/features-meta.json';
import runFileJson from './demo/run.json';
import { seedDemoCampaigns } from './seed-campaigns';

const DEMO_NAME = 'Trace Demo';

type ProjectFile      = { name: string; description: string };
type GroupsFile       = Array<{ name: string; position: number; features: string[] }>;
type ManualScenarioMeta = { name: string; steps?: { action: string; expected?: string }[] };
type FeatureMeta        = { description: string; manualScenarios: ManualScenarioMeta[] };
type FeaturesMetaFile = Record<string, FeatureMeta>;
type RunFile     = {
	featureFile: string;
	source: 'MANUAL' | 'CI';
	executedBy: string;
	environment: string | null;
	scenarios: Array<{
		name: string;
		status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'PENDING';
		durationMs: number | null;
		logs: string | null;
		errorMessage: string | null;
		note: string | null;
	}>;
};

const featureFiles = import.meta.glob('./demo/features/*.feature', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;

function readFeature(filename: string): string {
	const content = featureFiles[`./demo/features/${filename}`];
	if (content === undefined) throw new Error(`demo seed: missing feature file ${filename}`);
	return content;
}

export async function seedDemoProject(adminUserId: string): Promise<void> {
	const [existing] = await db.select({ id: projects.id }).from(projects).where(eq(projects.name, DEMO_NAME));
	if (existing) return;

	const projectFile = projectFileJson      as ProjectFile;
	const groupsFile  = groupsFileJson       as GroupsFile;
	const metaFile    = featuresMetaJson     as FeaturesMetaFile;
	const runFile     = runFileJson          as RunFile;

	const projectResult = await createProject({ name: projectFile.name, description: projectFile.description }, adminUserId);
	if (!projectResult.ok) throw new Error(`demo seed: createProject failed: ${projectResult.error}`);
	const project = projectResult.value;
	await grantAnyUserBlanket(project.id);

	const featureIdByFilename = new Map<string, string>();
	for (const g of groupsFile) {
		const [group] = await db
			.insert(featureGroups)
			.values({ projectId: project.id, name: g.name, position: g.position })
			.returning();
		if (!group) throw new Error('demo seed: group insert failed');

		for (const filename of g.features) {
			const content  = readFeature(filename);
			const featName = filename.replace(/^\d+-/, '').replace(/\.feature$/, '').replace(/-/g, ' ');
			const meta     = metaFile[filename];

			const feat = await db.transaction(async (tx) => {
				const codeSeq = await allocateCodeSeq(tx, project.id);
				const [row] = await tx
					.insert(features)
					.values({
						projectId:   project.id,
						groupId:     group.id,
						name:        featName,
						content,
						description: meta?.description ?? null,
						codeSeq,
					})
					.returning();
				if (!row) throw new Error('demo seed: feature insert failed');

				const scenarios = meta?.manualScenarios ?? [];
				for (const [i, sc] of scenarios.entries()) {
					const [scRow] = await tx
						.insert(manualScenarios)
						.values({ featureId: row.id, position: i + 1, name: sc.name })
						.returning();
					if (!scRow) throw new Error('demo seed: manual scenario insert failed');
					for (const [j, st] of (sc.steps ?? []).entries()) {
						await tx
							.insert(manualScenarioSteps)
							.values({ scenarioId: scRow.id, position: j + 1, action: st.action, expected: st.expected ?? null });
					}
				}

				return row;
			});
			featureIdByFilename.set(filename, feat.id);
		}
	}

	const runFeatureId = featureIdByFilename.get(runFile.featureFile);
	if (!runFeatureId) {
		throw new Error(`demo seed: run targets missing feature ${runFile.featureFile}`);
	}
	const runFeatureContent = readFeature(runFile.featureFile);

	const [run] = await db
		.insert(executions)
		.values({
			featureId:           runFeatureId,
			source:              runFile.source,
			executedBy:          runFile.executedBy,
			environment:         runFile.environment,
			featureContentAtStart: runFeatureContent,
			status:              'IN_PROGRESS',
		})
		.returning();
	if (!run) throw new Error('demo seed: run insert failed');

	let aggregate: 'PASSED' | 'FAILED' | 'SKIPPED' = 'PASSED';
	for (const [i, s] of runFile.scenarios.entries()) {
		const status = s.status === 'PENDING' ? ('SKIPPED' as const) : s.status;
		const [scRow] = await db.insert(scenarioResults).values({
			executionId:  run.id,
			scenarioName: s.name,
			position:     i + 1,
			status,
			durationMs:   s.durationMs,
			logs:         s.logs,
			errorMessage: s.errorMessage,
		}).returning({ id: scenarioResults.id });
		if (!scRow) throw new Error('demo seed: scenario result insert failed');
		const stepRows = extractScenarioSteps(runFeatureContent, s.name).map((st, j) => ({
			scenarioResultId: scRow.id, position: j + 1, keyword: st.keyword, text: st.text, expected: null, verdict: status,
		}));
		if (stepRows.length > 0) await db.insert(scenarioResultSteps).values(stepRows);
		if (s.status === 'FAILED') aggregate = 'FAILED';
		else if (s.status === 'SKIPPED' && aggregate !== 'FAILED') aggregate = 'SKIPPED';
	}

	const [visualSc] = await db.insert(scenarioResults).values({
		executionId:  run.id,
		scenarioName: 'Visual check of dashboard tiles',
		source:       'MANUAL',
		position:     1,
		status:       'PASSED',
	}).returning({ id: scenarioResults.id });
	if (!visualSc) throw new Error('demo seed: visual scenario insert failed');
	await db.insert(scenarioResultSteps).values([
		{ scenarioResultId: visualSc.id, position: 1, keyword: null, text: 'Open the dashboard', expected: 'All tiles render without layout shift', verdict: 'PASSED' },
		{ scenarioResultId: visualSc.id, position: 2, keyword: null, text: 'Compare tile counts to the active filters', expected: 'Counts match the filtered ticket set', verdict: 'PASSED' },
	]);

	await db
		.update(executions)
		.set({ status: aggregate, finishedAt: new Date() })
		.where(eq(executions.id, run.id));

	await seedDemoCampaigns(project.id, featureIdByFilename, readFeature);
}
