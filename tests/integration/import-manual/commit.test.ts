import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { manualScenarioSteps } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { commitManualImport } from '$lib/server/import/manual/commit';
import { listManualScenarios, addManualScenario } from '$lib/server/features/manual-scenarios';
import { mkFeature, mkProject } from '$testing/fixtures';
import type { ImportIR, ImportedScenario } from '$lib/shared/import-manual/ir';

function scn(ref: string, name: string, component: string, steps: ImportedScenario['steps'] = []): ImportedScenario {
	return { ref, externalKey: ref, name, description: null, steps, grouping: { component, issue: null } };
}

async function project() {
	return mkProject({ name: `Commit ${Date.now()}-${Math.random()}` });
}

describe('commitManualImport', () => {
	it('creates features by grouping and scenarios with ordered steps', async () => {
		const p = await project();
		const ir: ImportIR = { sourceId: 'zephyr-atm', scenarios: [
			scn('k1', 'Search returns results', 'Catalog', [{ action: 'Open', expected: 'Loads' }, { action: 'Click', expected: null }]),
			scn('k2', 'Other', 'Checkout'),
		] };

		const outcome = await commitManualImport({ projectId: p.id, ir, groupingField: 'component', decisions: {} });

		expect(outcome.imported).toBe(2);
		const feature = await db.query.features.findFirst({ where: (f, { and: a, eq: e }) => a(e(f.projectId, p.id), e(f.name, 'Catalog')) });
		if (!feature) throw new Error('expected the Catalog feature to exist');
		const scenarios = await listManualScenarios({ featureId: feature.id });
		expect(scenarios).toHaveLength(1);
		const [scenario] = scenarios;
		if (!scenario) throw new Error('expected one scenario under Catalog');
		const steps = await db.select().from(manualScenarioSteps).where(eq(manualScenarioSteps.scenarioId, scenario.id));
		expect(steps.map((s) => s.position)).toEqual([1, 2]);
	});

	it('skips scenarios whose decision is skip', async () => {
		const p = await project();
		const ir: ImportIR = { sourceId: 'zephyr-atm', scenarios: [scn('k1', 'A', 'Catalog'), scn('k2', 'B', 'Catalog')] };
		const outcome = await commitManualImport({ projectId: p.id, ir, groupingField: 'component', decisions: { k2: 'skip' } });
		expect(outcome.imported).toBe(1);
		expect(outcome.skipped).toBe(1);
	});

	it('records a failure for an import-decision name collision', async () => {
		const p = await project();
		const feature = await mkFeature(p.id, { name: 'Catalog', content: 'Feature: Catalog\n' });
		await addManualScenario({ featureId: feature.id, name: 'Login' });
		const ir: ImportIR = { sourceId: 'zephyr-atm', scenarios: [scn('k1', 'Login', 'Catalog')] };

		const outcome = await commitManualImport({ projectId: p.id, ir, groupingField: 'component', decisions: { k1: 'import' } });
		expect(outcome.imported).toBe(0);
		expect(outcome.failed).toHaveLength(1);
		expect(outcome.failed[0]?.ref).toBe('k1');
	});

	it('renames on a rename decision instead of failing', async () => {
		const p = await project();
		const feature = await mkFeature(p.id, { name: 'Catalog', content: 'Feature: Catalog\n' });
		await addManualScenario({ featureId: feature.id, name: 'Login' });
		const ir: ImportIR = { sourceId: 'zephyr-atm', scenarios: [scn('k1', 'Login', 'Catalog')] };

		const outcome = await commitManualImport({ projectId: p.id, ir, groupingField: 'component', decisions: { k1: 'rename' } });
		expect(outcome.imported).toBe(1);
		const scenarios = await listManualScenarios({ featureId: feature.id });
		expect(scenarios.map((s) => s.name).sort()).toEqual(['Login', 'Login (2)']);
	});
});
