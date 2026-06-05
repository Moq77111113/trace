import { describe, it, expect } from 'vitest';
import { detectAdapter } from '$lib/server/import/manual/adapters/registry';

describe('detectAdapter', () => {
  it('routes an ATM xml to the zephyr-atm adapter', () => {
    const file = { filename: 's.xml', bytes: Buffer.from('<project><testCases></testCases></project>') };
    expect(detectAdapter(file)?.id).toBe('zephyr-atm');
  });

  it('returns null for an unsupported file', () => {
    expect(detectAdapter({ filename: 's.txt', bytes: Buffer.from('hello') })).toBeNull();
  });
});
