import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { manualScenarioSteps } from '$lib/server/db/schema';
import { findOrCreateFeature } from '$lib/server/features/import-create';
import {
	appendManualScenario,
	findAvailableScenarioName,
	ManualScenarioNameTakenError,
} from '$lib/server/features/manual-scenarios';
import { stepAction, stepExpected } from '$lib/server/features/manual-scenario-steps';
import { resolveFeatureName } from '$lib/shared/import-manual/grouping';
import type { ImportIR, ImportedScenario } from '$lib/shared/import-manual/ir';

/** Per-scenario decision. `overwrite` is intentionally excluded for v1. */
export const scenarioDecisionSchema = z.enum(['import', 'skip', 'rename']);
export type ScenarioDecision = z.infer<typeof scenarioDecisionSchema>;

/** Validated input for a commit run, excluding the parsed IR. */
export const commitInputSchema = z.object({
	projectId: z.uuid(),
	groupingField: z.enum(['folder', 'component', 'issue', 'fixed']),
	fixedFeatureName: z.string().trim().min(1).max(200).optional(),
	decisions: z.record(z.string(), scenarioDecisionSchema).default({}),
});

/** A scenario that could not be imported, with the reason. */
export type CommitFailure = { ref: string; name: string; reason: string };
export type CommitOutcome = { imported: number; skipped: number; failed: CommitFailure[] };

type CommitArgs = z.infer<typeof commitInputSchema> & { ir: ImportIR };

type PersistArgs = {
	projectId: string;
	featureName: string;
	scenario: ImportedScenario;
	decision: ScenarioDecision;
};

async function persistScenario({ projectId, featureName, scenario, decision }: PersistArgs): Promise<void> {
	await db.transaction(async (tx) => {
		const featureId = await findOrCreateFeature(tx, projectId, featureName);
		const name =
			decision === 'rename'
				? await findAvailableScenarioName(tx, featureId, scenario.name)
				: scenario.name;

		const created = await appendManualScenario(tx, featureId, name);

		for (const [i, step] of scenario.steps.entries()) {
			await tx.insert(manualScenarioSteps).values({
				scenarioId: created.id,
				position: i + 1,
				action: stepAction.parse(step.action),
				expected: stepExpected.parse(step.expected),
			});
		}
	});
}

/** Commit an import: group scenarios into features, then persist each per its decision (default import). */
export async function commitManualImport(args: CommitArgs): Promise<CommitOutcome> {
	const parsed = commitInputSchema.parse(args);
	const fixedName = parsed.fixedFeatureName ?? '';
	const outcome: CommitOutcome = { imported: 0, skipped: 0, failed: [] };

	for (const scenario of args.ir.scenarios) {
		const decision = parsed.decisions[scenario.ref] ?? 'import';
		if (decision === 'skip') {
			outcome.skipped += 1;
			continue;
		}

		const featureName = resolveFeatureName(scenario, parsed.groupingField, fixedName);

		try {
			await persistScenario({ projectId: parsed.projectId, featureName, scenario, decision });
			outcome.imported += 1;
		} catch (err) {
			const reason =
				err instanceof ManualScenarioNameTakenError
					? `name already used (${err.conflictWith})`
					: err instanceof Error
						? err.message
						: 'unknown error';
			outcome.failed.push({ ref: scenario.ref, name: scenario.name, reason });
		}
	}

	return outcome;
}
