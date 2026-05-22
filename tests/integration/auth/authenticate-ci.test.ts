import { describe, it, expect } from 'vitest';
import { authenticateCi, createApiKey } from '$lib/server/api-keys';
import { mkProject } from '$testing/fixtures';
import { mkUser } from '$testing/integration/_helpers/api-key';

describe('authenticateCi', () => {
  it('returns Ok with projectId derived from the API key metadata', async () => {
    const project = await mkProject({ name: `Auth ${Date.now()}-${Math.random()}` });
    const user    = await mkUser();
    const { key } = await createApiKey({ projectId: project.id, name: 'ci', userId: user.id, expiresAt: null });

    const result = await authenticateCi(`Bearer ${key}`);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projectId).toBe(project.id);
    expect(result.value.tokenName).toBe('ci');
  });

  it('returns CI_AUTH_HEADER_MISSING when authorization is null', async () => {
    const result = await authenticateCi(null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CI_AUTH_HEADER_MISSING');
  });

  it('returns CI_AUTH_SCHEME_INVALID when scheme is not Bearer', async () => {
    const result = await authenticateCi('Basic abc');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CI_AUTH_SCHEME_INVALID');
  });

  it('returns CI_AUTH_KEY_INVALID for a garbage token', async () => {
    const result = await authenticateCi('Bearer not-a-real-key');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CI_AUTH_KEY_INVALID');
  });
});
