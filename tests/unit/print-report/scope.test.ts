import { describe, it, expect } from 'vitest';
import {
	parseRunScope,
	parseAggregatedScope,
	parseCampaignScope,
} from '$lib/features/print-report/lib/scope';

describe('parseRunScope', () => {
	it('defaults to "full" when missing or unknown', () => {
		expect(parseRunScope(null)).toBe('full');
		expect(parseRunScope(undefined)).toBe('full');
		expect(parseRunScope('')).toBe('full');
		expect(parseRunScope('bogus')).toBe('full');
	});
	it('accepts "full" and "failed"', () => {
		expect(parseRunScope('full')).toBe('full');
		expect(parseRunScope('failed')).toBe('failed');
	});
});

describe('parseAggregatedScope', () => {
	it('defaults to "full"; accepts "full" and "failed"', () => {
		expect(parseAggregatedScope(null)).toBe('full');
		expect(parseAggregatedScope('failed')).toBe('failed');
		expect(parseAggregatedScope('required')).toBe('full');
	});
});

describe('parseCampaignScope', () => {
	it('defaults to "full"; accepts "full", "required", "failed"', () => {
		expect(parseCampaignScope(null)).toBe('full');
		expect(parseCampaignScope('required')).toBe('required');
		expect(parseCampaignScope('failed')).toBe('failed');
		expect(parseCampaignScope('bogus')).toBe('full');
	});
});
