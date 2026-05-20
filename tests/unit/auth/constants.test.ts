import { describe, it, expect } from 'vitest';
import {
  PASSWORD_RESET_TTL_MIN,
  PASSWORD_RESET_TTL_S,
  PASSWORD_RESET_RATE_PER_MIN,
  PASSWORD_MIN_LENGTH,
} from '$lib/server/auth/constants';

describe('auth constants', () => {
  it('TTL seconds equals TTL minutes × 60', () => {
    expect(PASSWORD_RESET_TTL_S).toBe(PASSWORD_RESET_TTL_MIN * 60);
  });
  it('rate limit is positive', () => {
    expect(PASSWORD_RESET_RATE_PER_MIN).toBeGreaterThan(0);
  });
  it('minimum password length is at least 12', () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(12);
  });
});
