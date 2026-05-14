import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import type { ParseResult, ParsedScenario } from './types';

const builder = new AstBuilder(IdGenerator.uuid());
const matcher = new GherkinClassicTokenMatcher();

function stripAt(s: string): string {
	return s.startsWith('@') ? s.slice(1) : s;
}

export function parse(source: string): ParseResult {
	if (!source.trim()) return { name: null, scenarios: [], tags: [], errors: [] };

	let doc;
	try {
		doc = new Parser(builder, matcher).parse(source);
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		return { name: null, scenarios: [], tags: [], errors: [{ line: 1, message }] };
	}

	const feature = doc.feature;
	if (!feature) {
		return { name: null, scenarios: [], tags: [], errors: [{ line: 1, message: 'No Feature: declaration' }] };
	}

	const featureTags = (feature.tags ?? []).map((t) => stripAt(t.name));
	const tagSet      = new Set<string>(featureTags);
	const scenarios:  ParsedScenario[] = [];

	for (const child of feature.children ?? []) {
		if (!child.scenario) continue;

		const scenarioTags = (child.scenario.tags ?? []).map((t) => stripAt(t.name));
		scenarioTags.forEach((t) => tagSet.add(t));

		scenarios.push({
			name: child.scenario.name,
			line: child.scenario.location?.line ?? 0,
			tags: scenarioTags,
		});
	}

	return { name: feature.name || null, scenarios, tags: [...tagSet], errors: [] };
}
