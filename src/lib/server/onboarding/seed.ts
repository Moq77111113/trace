import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import {
	projects,
	featureGroups,
	features,
	executions,
	scenarioResults,
} from '$lib/server/db/schema';
import { createProject } from '$lib/server/projects/create';
import { allocateCodeSeq } from '$lib/server/features/code-seq';

const DEMO_NAME = 'Trace Demo';
const DEMO_DIR  = join(dirname(fileURLToPath(import.meta.url)), 'demo');

type ProjectFile = { name: string; description: string };
type GroupsFile  = Array<{ name: string; position: number; features: string[] }>;
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

export async function seedDemoProject(_adminUserId: string): Promise<void> {
	const [existing] = await db.select({ id: projects.id }).from(projects).where(eq(projects.name, DEMO_NAME));
	if (existing) return;

	const projectFile = JSON.parse(await readFile(join(DEMO_DIR, 'project.json'), 'utf8')) as ProjectFile;
	const groupsFile  = JSON.parse(await readFile(join(DEMO_DIR, 'groups.json'),  'utf8')) as GroupsFile;
	const runFile     = JSON.parse(await readFile(join(DEMO_DIR, 'run.json'),     'utf8')) as RunFile;

	const projectResult = await createProject({ name: projectFile.name, description: projectFile.description });
	if ('error' in projectResult) throw new Error(`demo seed: createProject failed: ${projectResult.error}`);
	const project = projectResult;

	const featureIdByFilename = new Map<string, string>();
	for (const g of groupsFile) {
		const [group] = await db
			.insert(featureGroups)
			.values({ projectId: project.id, name: g.name, position: g.position })
			.returning();
		if (!group) throw new Error('demo seed: group insert failed');

		for (const filename of g.features) {
			const content = await readFile(join(DEMO_DIR, 'features', filename), 'utf8');
			const featName = filename.replace(/^\d+-/, '').replace(/\.feature$/, '').replace(/-/g, ' ');
			const feat = await db.transaction(async (tx) => {
				const codeSeq = await allocateCodeSeq(tx, project.id);
				const [row] = await tx
					.insert(features)
					.values({ projectId: project.id, groupId: group.id, name: featName, content, codeSeq })
					.returning();
				if (!row) throw new Error('demo seed: feature insert failed');
				return row;
			});
			featureIdByFilename.set(filename, feat.id);
		}
	}

	const runFeatureId = featureIdByFilename.get(runFile.featureFile);
	if (!runFeatureId) {
		throw new Error(`demo seed: run targets missing feature ${runFile.featureFile}`);
	}
	const runFeatureContent = await readFile(join(DEMO_DIR, 'features', runFile.featureFile), 'utf8');

	const [run] = await db
		.insert(executions)
		.values({
			featureId:           runFeatureId,
			source:              runFile.source,
			executedBy:          runFile.executedBy,
			environment:         runFile.environment,
			featureContentAtStart: runFeatureContent,
			status:              'IN_PROGRESS',
			notes:               null,
		})
		.returning();
	if (!run) throw new Error('demo seed: run insert failed');

	let aggregate: 'PASSED' | 'FAILED' | 'SKIPPED' = 'PASSED';
	for (const s of runFile.scenarios) {
		await db.insert(scenarioResults).values({
			executionId:        run.id,
			scenarioName: s.name,
			status:       s.status === 'PENDING' ? 'SKIPPED' : s.status,
			durationMs:   s.durationMs,
			logs:         s.logs,
			errorMessage: s.errorMessage,
		});
		if (s.status === 'FAILED') aggregate = 'FAILED';
		else if (s.status === 'SKIPPED' && aggregate !== 'FAILED') aggregate = 'SKIPPED';
	}

	const noteLines = runFile.scenarios
		.filter((s) => s.note)
		.map((s) => `• ${s.name}: ${s.note}`)
		.join('\n');

	await db
		.update(executions)
		.set({ status: aggregate, finishedAt: new Date(), notes: noteLines || null })
		.where(eq(executions.id, run.id));
}
