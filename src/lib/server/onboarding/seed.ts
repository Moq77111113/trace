import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import {
	projects,
	featureGroups,
	features,
	manualScenarios,
	executions,
	scenarioResults,
} from '$lib/server/db/schema';
import { createProject } from '$lib/server/projects/create';
import { grantAnyUserBlanket } from '$lib/server/authz/seed';
import { allocateCodeSeq } from '$lib/server/features/internal/code-seq';
import projectFileJson from './demo/project.json';
import groupsFileJson from './demo/groups.json';
import featuresMetaJson from './demo/features-meta.json';
import runFileJson from './demo/run.json';

const DEMO_NAME = 'Trace Demo';

type ProjectFile      = { name: string; description: string };
type GroupsFile       = Array<{ name: string; position: number; features: string[] }>;
type FeatureMeta      = { description: string; manualScenarios: string[] };
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
				for (const [i, name] of scenarios.entries()) {
					await tx
						.insert(manualScenarios)
						.values({ featureId: row.id, position: i + 1, name });
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
		await db.insert(scenarioResults).values({
			executionId:  run.id,
			scenarioName: s.name,
			position:     i + 1,
			status:       s.status === 'PENDING' ? 'SKIPPED' : s.status,
			durationMs:   s.durationMs,
			logs:         s.logs,
			errorMessage: s.errorMessage,
		});
		if (s.status === 'FAILED') aggregate = 'FAILED';
		else if (s.status === 'SKIPPED' && aggregate !== 'FAILED') aggregate = 'SKIPPED';
	}

	await db.insert(scenarioResults).values({
		executionId:  run.id,
		scenarioName: 'Visual check of dashboard tiles',
		source:       'MANUAL',
		position:     1,
		status:       'PASSED',
	});

	await db
		.update(executions)
		.set({ status: aggregate, finishedAt: new Date() })
		.where(eq(executions.id, run.id));
}
