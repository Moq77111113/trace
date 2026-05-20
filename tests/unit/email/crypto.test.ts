import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireEnv } from '$lib/server/config/env';
import {
  encryptSmtpPassword,
  decryptSmtpPassword,
  DecryptionFailedError,
} from '$lib/server/email/crypto';

vi.mock('$lib/server/config/env', () => ({
  requireEnv: vi.fn(),
  readEnv: vi.fn(),
}));

const TEST_SECRET = 'a'.repeat(32);

beforeEach(() => {
  vi.mocked(requireEnv).mockReturnValue(TEST_SECRET);
});

describe('email crypto', () => {
  it('round-trips a password', () => {
    const ct = encryptSmtpPassword('hunter2');
    expect(ct).toMatch(/^v1:[^:]+:[^:]+:[^:]+$/);
    expect(decryptSmtpPassword(ct)).toBe('hunter2');
  });

  it('produces different ciphertext on every call (random IV)', () => {
    const a = encryptSmtpPassword('same');
    const b = encryptSmtpPassword('same');
    expect(a).not.toBe(b);
    expect(decryptSmtpPassword(a)).toBe('same');
    expect(decryptSmtpPassword(b)).toBe('same');
  });

  it('throws DecryptionFailedError on wrong key', () => {
    const ct = encryptSmtpPassword('p');
    vi.mocked(requireEnv).mockReturnValue('b'.repeat(32));
    expect(() => decryptSmtpPassword(ct)).toThrow(DecryptionFailedError);
  });

  it('throws DecryptionFailedError on unknown envelope version', () => {
    expect(() => decryptSmtpPassword('v9:aa:bb:cc')).toThrow(DecryptionFailedError);
  });

  it('throws DecryptionFailedError on garbled ciphertext', () => {
    expect(() => decryptSmtpPassword('not-an-envelope')).toThrow(DecryptionFailedError);
  });
});
