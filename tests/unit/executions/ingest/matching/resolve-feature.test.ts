import { describe, it, expect } from 'vitest';
import { resolveFeature } from '$lib/server/executions/ingest/matching/resolve-feature';
import { mkFeature, mkProject } from '$testing/fixtures';

describe('resolveFeature', () => {
	it('hits the code-tag strategy first when @trace= is present and resolvable', async () => {
		const project = await mkProject({ name: `Tag wins ${Date.now()}-${Math.random()}`, codePrefix: 'rt' });
		const tagged = await mkFeature(project.id, { name: 'Login' });
		await mkFeature(project.id, { name: 'Other' });
		const tag = `@trace=rt-${tagged.codeSeq}`;

		const result = await resolveFeature({ featureName: 'Anything', tags: [tag] }, project.id);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.via).toBe('code');
			expect(result.value.feature.id).toBe(tagged.id);
		}
	});

	it('falls back to gherkin-name when no @trace= tag is present and Gherkin Feature: line matches', async () => {
		const project = await mkProject({ name: `Name fallback ${Date.now()}-${Math.random()}` });
		const feature = await mkFeature(project.id, { name: 'Login' });

		const result = await resolveFeature({ featureName: 'Login', tags: [] }, project.id);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.via).toBe('gherkin-name');
			expect(result.value.feature.id).toBe(feature.id);
		}
	});

	it('matches via gherkin-name when no @trace= tag and Gherkin Feature: differs from features.name', async () => {
		const project = await mkProject({ name: `Gherkin tier ${Date.now()}-${Math.random()}` });
		const feature = await mkFeature(project.id, {
			name:    'admin alias',
			content: 'Feature: Real prose\n  Scenario: A\n',
		});

		const result = await resolveFeature({ featureName: 'Real prose', tags: [] }, project.id);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.via).toBe('gherkin-name');
		expect(result.value.feature.id).toBe(feature.id);
	});

	it('falls back to name match when gherkin-name has no candidate (content lacks Feature: line)', async () => {
		const project = await mkProject({ name: `Name only ${Date.now()}-${Math.random()}` });
		const feature = await mkFeature(project.id, { name: 'Login', content: '' });

		const result = await resolveFeature({ featureName: 'Login', tags: [] }, project.id);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.via).toBe('name');
			expect(result.value.feature.id).toBe(feature.id);
		}
	});

	it('does NOT fall back to name match when @trace= tag references a missing code', async () => {
		const project = await mkProject({ name: `No fallback ${Date.now()}-${Math.random()}`, codePrefix: 'nf' });
		await mkFeature(project.id, { name: 'Login' });

		const result = await resolveFeature({ featureName: 'Login', tags: ['@trace=nf-999'] }, project.id);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('MATCH_TAG_REFERENCES_MISSING_CODE');
			expect(result.error.detail).toContain('nf-999');
		}
	});

	it('returns MATCH_NO_STRATEGY_HIT when neither tag nor name matches', async () => {
		const project = await mkProject({ name: `Nothing ${Date.now()}-${Math.random()}` });

		const result = await resolveFeature({ featureName: 'Ghost', tags: [] }, project.id);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('MATCH_NO_STRATEGY_HIT');
		}
	});
});
