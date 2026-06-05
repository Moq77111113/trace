// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { zephyrAtmAdapter } from '$lib/server/import/manual/adapters/zephyr-atm';

const bytes = readFileSync(fileURLToPath(new URL('../../../static/samples/zephyr-sample.xml', import.meta.url)));

describe('bundled zephyr sample', () => {
  it('is a valid ATM export the adapter can parse into multiple grouped scenarios', () => {
    expect(zephyrAtmAdapter.detect({ filename: 'zephyr-sample.xml', bytes })).toBe(true);
    const ir = zephyrAtmAdapter.parse({ filename: 'zephyr-sample.xml', bytes });
    expect(ir.scenarios.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ir.scenarios.map((s) => s.grouping.component)).size).toBeGreaterThanOrEqual(2);
  });
});
