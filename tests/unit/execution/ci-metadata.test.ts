import { describe, it, expect } from 'vitest';
import { readCiMetadata } from '$lib/entities/execution/lib/ci-metadata';

function fromMap(headers: Record<string, string>) {
  return (name: string) => headers[name] ?? null;
}

describe('readCiMetadata', () => {
  it('reads x-ci-app-version into ciMetadata.appVersion', () => {
    const meta = readCiMetadata(fromMap({ 'x-ci-app-version': '1.2.0' }));
    expect(meta?.appVersion).toBe('1.2.0');
  });

  it('leaves appVersion unset when the header is absent', () => {
    const meta = readCiMetadata(fromMap({ 'x-ci-branch': 'main' }));
    expect(meta?.appVersion).toBeUndefined();
    expect(meta?.branch).toBe('main');
  });

  it('returns null when no CI headers are present', () => {
    expect(readCiMetadata(fromMap({}))).toBeNull();
  });
});
