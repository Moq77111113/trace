import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import {
	projects,
	featureGroups,
	features,
	runs,
	scenarioResults,
} from '$lib/server/db/schema';

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

	const [project] = await db
		.insert(projects)
		.values({ name: projectFile.name, description: projectFile.description })
		.returning();
	if (!project) throw new Error('demo seed: project insert failed');

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
			const [feat] = await db
				.insert(features)
				.values({ projectId: project.id, groupId: group.id, name: featName, content })
				.returning();
			if (!feat) throw new Error('demo seed: feature insert failed');
			featureIdByFilename.set(filename, feat.id);
		}
	}

	const runFeatureId = featureIdByFilename.get(runFile.featureFile);
	if (!runFeatureId) {
		throw new Error(`demo seed: run targets missing feature ${runFile.featureFile}`);
	}
	const runFeatureContent = await readFile(join(DEMO_DIR, 'features', runFile.featureFile), 'utf8');

	const [run] = await db
		.insert(runs)
		.values({
			featureId:           runFeatureId,
			source:              runFile.source,
			executedBy:          runFile.executedBy,
			environment:         runFile.environment,
			featureContentAtRun: runFeatureContent,
			status:              'RUNNING',
			notes:               null,
		})
		.returning();
	if (!run) throw new Error('demo seed: run insert failed');

	let aggregate: 'PASSED' | 'FAILED' | 'SKIPPED' = 'PASSED';
	for (const s of runFile.scenarios) {
		await db.insert(scenarioResults).values({
			runId:        run.id,
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
		.update(runs)
		.set({ status: aggregate, finishedAt: new Date(), notes: noteLines || null })
		.where(eq(runs.id, run.id));
}
