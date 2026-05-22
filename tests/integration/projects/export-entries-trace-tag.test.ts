import { describe, it, expect } from 'vitest';
import { buildExportEntries } from '$lib/server/projects/export-zip';
import { mkFeature, mkProject } from '$testing/fixtures';

describe('buildExportEntries — trace tag', () => {
  it('prepends @trace=<featureCode> above the Feature: line for every entry', async () => {
    const project = await mkProject({ name: `Zip ${Date.now()}-${Math.random()}`, codePrefix: 'zt' });
    const login   = await mkFeature(project.id, { name: 'Login',  content: 'Feature: Login\n\n  Scenario: A\n' });
    const signup  = await mkFeature(project.id, { name: 'Signup', content: 'Feature: Signup\n\n  Scenario: B\n' });

    const entries = await buildExportEntries(project.id);
    expect(entries).not.toBeNull();

    const loginEntry  = entries?.find((e) => e.content.includes('Feature: Login'));
    const signupEntry = entries?.find((e) => e.content.includes('Feature: Signup'));

    expect(loginEntry?.content).toMatch(new RegExp(`^@trace=zt-${login.codeSeq}\\n`));
    expect(signupEntry?.content).toMatch(new RegExp(`^@trace=zt-${signup.codeSeq}\\n`));
  });

  it('does not duplicate the tag when content already contains @trace=<code> in the head', async () => {
    const project = await mkProject({ name: `Zip dup ${Date.now()}-${Math.random()}`, codePrefix: 'zd' });
    const feature = await mkFeature(project.id, {
      name:    'Tagged',
      content: `@trace=zd-1\nFeature: Tagged\n\n  Scenario: A\n`,
    });

    const entries = await buildExportEntries(project.id);
    expect(entries).not.toBeNull();

    const taggedEntry = entries?.find((e) => e.content.includes('Feature: Tagged'));
    expect(taggedEntry?.content).toMatch(new RegExp(`^@trace=zd-${feature.codeSeq}\\n`));
    expect(taggedEntry?.content.match(/@trace=/g)?.length).toBe(1);
  });

  it('returns null when the project has no exportable features', async () => {
    const project = await mkProject({ name: `Empty ${Date.now()}-${Math.random()}` });

    const entries = await buildExportEntries(project.id);
    expect(entries).toBeNull();
  });
});
