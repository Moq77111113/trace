// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { zephyrAtmAdapter } from '$lib/server/import/manual/adapters/zephyr-atm';

const bytes = readFileSync(fileURLToPath(new URL('../../fixtures/zephyr/sample.xml', import.meta.url)));
const file = { filename: 'sample.xml', bytes };

describe('zephyrAtmAdapter.detect', () => {
  it('accepts an ATM export with a <project> root and <testCases>', () => {
    expect(zephyrAtmAdapter.detect(file)).toBe(true);
  });

  it('rejects unrelated xml', () => {
    expect(zephyrAtmAdapter.detect({ filename: 'x.xml', bytes: Buffer.from('<rss></rss>') })).toBe(false);
  });
});

describe('zephyrAtmAdapter.parse', () => {
  const ir = zephyrAtmAdapter.parse(file);
  const [first, second] = ir.scenarios;

  if (first === undefined || second === undefined) {
    throw new Error('expected the fixture to yield two scenarios');
  }

  it('emits one scenario per test case', () => {
    expect(ir.sourceId).toBe('zephyr-atm');
    expect(ir.scenarios).toHaveLength(2);
  });

  it('maps name, externalKey and objective→description', () => {
    expect(first.name).toBe('Search returns results');
    expect(first.externalKey).toBe('DEMO-T1');
    expect(first.ref).toBe('DEMO-T1');
    expect(first.description).toBe('Results render correctly');
  });

  it('maps description→action and expectedResult→expected, decoding html', () => {
    expect(first.steps[0]).toEqual({ action: 'Open the app', expected: 'The home page loads' });
  });

  it('sets expected to null when a step has no expectedResult', () => {
    expect(first.steps[1]).toEqual({ action: 'Submit the search', expected: null });
  });

  it('extracts component and linked issue summary as grouping candidates', () => {
    expect(first.grouping.component).toBe('Catalog');
    expect(first.grouping.issue).toBe('Search epic');
    expect(first.grouping.folder).toBeNull();
  });

  it('imports a stepless case as a scenario with zero steps', () => {
    expect(second.name).toBe('Empty automated case');
    expect(second.steps).toEqual([]);
  });
});
