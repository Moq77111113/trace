import { describe, it, expect } from 'vitest';
import { parse } from '$lib/shared/gherkin/parse';

describe('parse', () => {
	it('extracts feature name', () => {
		const r = parse('Feature: Login\n\n  Scenario: A\n    Given x\n');
		expect(r.name).toBe('Login');
		expect(r.errors).toEqual([]);
	});

	it('extracts scenarios and tags', () => {
		const src = `@smoke @auth
Feature: Login

  @slow
  Scenario: With 2FA
    Given x
`;
		const r = parse(src);
		expect(r.scenarios.length).toBe(1);
		expect(r.scenarios[0]?.name).toBe('With 2FA');
		expect(r.tags.slice().sort()).toEqual(['auth', 'slow', 'smoke']);
	});

	it('reports syntax errors with line number', () => {
		const r = parse('Feature Login\n  Scenrio: A\n');
		expect(r.errors.length).toBeGreaterThan(0);
		expect(r.errors[0]?.line).toBeGreaterThan(0);
	});

	it('returns null name for empty content', () => {
		const r = parse('');
		expect(r.name).toBeNull();
	});
});
