import { describe, it, expect } from 'vitest';
import { matchByName } from '$lib/server/executions/ingest/matching/strategies/name';
import { mkFeature, mkProject } from '$testing/fixtures';

describe('matchByName', () => {
	it('matches case-insensitively on feature name', async () => {
		const project = await mkProject({ name: `Match name ${Date.now()}-${Math.random()}` });
		const feature = await mkFeature(project.id, { name: 'Login' });

		const result = await matchByName('LOGIN', project.id);

		expect(result?.id).toBe(feature.id);
	});

	it('returns null when no feature matches', async () => {
		const project = await mkProject({ name: `No match ${Date.now()}-${Math.random()}` });

		const result = await matchByName('Nonexistent', project.id);

		expect(result).toBeNull();
	});

	it('excludes archived features from the match', async () => {
		const project = await mkProject({ name: `Archived ${Date.now()}-${Math.random()}` });
		await mkFeature(project.id, { name: 'Login', archived: true });

		const result = await matchByName('Login', project.id);

		expect(result).toBeNull();
	});
});
