import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { requireEnv } from '$lib/server/config/env';
import { SMTP_PASSWORD_ENC_VERSION } from './constants';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const HKDF_SALT = Buffer.from('trace.smtp.password.v1', 'utf8');
const HKDF_INFO = Buffer.from('aes-256-gcm', 'utf8');

export class DecryptionFailedError extends Error {
  readonly code = 'DECRYPTION_FAILED';
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionFailedError';
  }
}

function deriveKey(): Buffer {
  const secret = requireEnv('TRACE_AUTH_SECRET');
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), HKDF_SALT, HKDF_INFO, KEY_LEN));
}

/** Encrypts a plaintext SMTP password, returning a versioned envelope string. */
export function encryptSmtpPassword(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v${SMTP_PASSWORD_ENC_VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

function asTuple4(parts: string[]): [string, string, string, string] {
  if (parts.length !== 4) throw new DecryptionFailedError('malformed envelope');
  return parts as [string, string, string, string];
}

/** Decrypts a versioned envelope string, throwing DecryptionFailedError on any failure. */
export function decryptSmtpPassword(envelope: string): string {
  const [versionTag, ivB64, tagB64, ctB64] = asTuple4(envelope.split(':'));
  const version = Number(versionTag.replace(/^v/, ''));
  if (version !== SMTP_PASSWORD_ENC_VERSION) {
    throw new DecryptionFailedError(`unsupported envelope version: ${versionTag}`);
  }
  try {
    const key = deriveKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const cipher = createDecipheriv(ALGO, key, iv);
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(ct), cipher.final()]).toString('utf8');
  } catch (err) {
    throw new DecryptionFailedError(err instanceof Error ? err.message : 'decryption failed');
  }
}
