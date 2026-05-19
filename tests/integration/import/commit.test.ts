import { describe, it, expect } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { featureGroups, features, tags, featureTags } from '$lib/server/db/schema';
import { mkProject } from '../../fixtures';
import { createFeature } from '$lib/server/features/create';
import { archiveFeature } from '$lib/server/features/archive';
import { createGroup } from '$lib/server/groups/create';
import { saveFeature } from '$lib/server/features/save';
import { parseBatch } from '$lib/server/import/parse-batch';
import { commitBatch, type Decision } from '$lib/server/import/commit';

function file(filename: string, content: string) {
  return { filename, bytes: Buffer.from(content) };
}

function decisionsFor(rows: { rowId: string }[], action: Decision): Record<string, Decision> {
  return Object.fromEntries(rows.map((r) => [r.rowId, action]));
}

describe('commitBatch', () => {
  it('imports new rows, persists parsed tags, skips DB collisions by default', async () => {
    const p = await mkProject({ name: `Imp ${Date.now()}` });
    await createFeature({ projectId: p.id, name: 'Login' });

    const preview = await parseBatch(p.id, [
      file('a.feature', '@smoke @auth\nFeature: Alpha\n  Scenario: A\n    Given x\n'),
      file('b.feature', 'Feature: Login\n  Scenario: A\n    Given x\n'),
    ]);

    const decisions = Object.fromEntries(
      preview.rows.map((r) => [r.rowId, r.status === 'new' ? 'import' : 'skip']),
    ) as Record<string, Decision>;

    const out = await commitBatch({ previewId: preview.previewId, decisions });

    expect(out.imported).toBe(1);
    expect(out.skipped).toBe(1);
    expect(out.failed).toHaveLength(0);

    const rows = await db.select().from(features).where(eq(features.projectId, p.id));
    const names = rows.map((r) => r.name).sort();
    expect(names).toEqual(['Alpha', 'Login']);

    const alpha = rows.find((r) => r.name === 'Alpha');
    const links = await db.select({ tagName: tags.name }).from(featureTags)
      .innerJoin(tags, eq(tags.id, featureTags.tagId))
      .where(eq(featureTags.featureId, alpha!.id));
    expect(links.map((l) => l.tagName).sort()).toEqual(['auth', 'smoke']);
  });

  it('overwrites colliding features via saveFeature codepath and bumps version', async () => {
    const p   = await mkProject({ name: `Ovw ${Date.now()}` });
    const old = await createFeature({ projectId: p.id, name: 'Tgt' });

    const updated = await saveFeature({
      featureId:       old.id,
      content:         'Feature: Tgt\n  Scenario: Original\n    Given x\n',
      expectedVersion: 1,
      editor:          'seed',
    });
    if (updated.conflict) throw new Error('seed conflict');
    const baseVersion = updated.feature.version;

    const preview = await parseBatch(p.id, [
      file('over.feature', '@updated\nFeature: Tgt\n  Scenario: Replaced\n    Given y\n'),
    ]);

    const out = await commitBatch({
      previewId: preview.previewId,
      decisions: decisionsFor(preview.rows, 'overwrite'),
    });

    expect(out.imported).toBe(1);

    const row = await db.query.features.findFirst({ where: eq(features.id, old.id) });
    expect(row?.content).toContain('Scenario: Replaced');
    expect(row?.version).toBeGreaterThan(baseVersion);
  });

  it('rename strategy inserts under a unique " (n)" suffix without touching the original', async () => {
    const p   = await mkProject({ name: `Rnm ${Date.now()}` });
    await createFeature({ projectId: p.id, name: 'Same' });

    const preview = await parseBatch(p.id, [
      file('s.feature', 'Feature: Same\n  Scenario: Fresh\n    Given z\n'),
    ]);

    const out = await commitBatch({
      previewId: preview.previewId,
      decisions: decisionsFor(preview.rows, 'rename'),
    });

    expect(out.imported).toBe(1);

    const rows = await db.select().from(features).where(eq(features.projectId, p.id));
    expect(rows.map((r) => r.name).sort()).toEqual(['Same', 'Same (2)']);
    const renamed = rows.find((r) => r.name === 'Same (2)');
    expect(renamed?.content).toContain('Feature: Same (2)');
    expect(renamed?.content).toContain('Scenario: Fresh');
  });

  it('isolates per-row failures so siblings still commit', async () => {
    const p = await mkProject({ name: `Iso ${Date.now()}` });

    const preview = await parseBatch(p.id, [
      file('ok.feature',   'Feature: Ok\n  Scenario: A\n    Given x\n'),
      file('bad.feature',  'Feature: Bad\n  Scenario: B\n    Given x\n'),
    ]);

    const decisions: Record<string, Decision> = {};
    for (const r of preview.rows) {
      decisions[r.rowId] = r.filename === 'bad.feature' ? 'overwrite' : 'import';
    }

    const out = await commitBatch({ previewId: preview.previewId, decisions });

    expect(out.imported).toBe(1);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]?.filename).toBe('bad.feature');

    const rows = await db.select().from(features).where(and(eq(features.projectId, p.id)));
    expect(rows.map((r) => r.name)).toEqual(['Ok']);
  });

  it('imports a feature whose name matches an archived one as a fresh row', async () => {
    const p = await mkProject({ name: `ArcImp ${Date.now()}` });
    const old = await createFeature({ projectId: p.id, name: 'Reborn' });
    await archiveFeature(old.id);

    const preview = await parseBatch(p.id, [
      file('r.feature', '@reborn\nFeature: Reborn\n  Scenario: New\n    Given x\n'),
    ]);

    const out = await commitBatch({
      previewId: preview.previewId,
      decisions: decisionsFor(preview.rows, 'import'),
    });

    expect(out.imported).toBe(1);
    expect(out.failed).toHaveLength(0);

    const live = await db.select().from(features).where(and(eq(features.projectId, p.id), eq(features.archived, false)));
    expect(live.map((r) => r.name)).toEqual(['Reborn']);
    expect(live[0]?.id).not.toBe(old.id);
  });

  it('rename strategy skips archived names when finding a free slot', async () => {
    const p = await mkProject({ name: `ArcRnm ${Date.now()}` });
    await createFeature({ projectId: p.id, name: 'Pick' });
    const archived = await createFeature({ projectId: p.id, name: 'Pick (2)' });
    await archiveFeature(archived.id);

    const preview = await parseBatch(p.id, [
      file('p.feature', 'Feature: Pick\n  Scenario: Q\n    Given y\n'),
    ]);

    const out = await commitBatch({
      previewId: preview.previewId,
      decisions: decisionsFor(preview.rows, 'rename'),
    });

    expect(out.imported).toBe(1);

    const live = await db.select().from(features).where(and(eq(features.projectId, p.id), eq(features.archived, false)));
    expect(live.map((r) => r.name).sort()).toEqual(['Pick', 'Pick (2)']);
  });

  it('creates the group on import when meta references a missing one', async () => {
    const p = await mkProject({ name: `GmNew ${Date.now()}` });

    const preview = await parseBatch(p.id, [
      file('a.feature', '# trace-group: Onboarding\nFeature: Sign Up\n  Scenario: A\n    Given x\n'),
    ]);

    await commitBatch({
      previewId: preview.previewId,
      decisions: decisionsFor(preview.rows, 'import'),
    });

    const created = await db.query.featureGroups.findFirst({
      where: and(eq(featureGroups.projectId, p.id), eq(featureGroups.name, 'Onboarding')),
    });
    expect(created).not.toBeUndefined();

    const feature = await db.query.features.findFirst({
      where: and(eq(features.projectId, p.id), eq(features.name, 'Sign Up')),
    });
    expect(feature?.groupId).toBe(created?.id);
  });

  it('reuses an existing group case-insensitively without duplicating', async () => {
    const p = await mkProject({ name: `GmExist ${Date.now()}` });
    const g = await createGroup({ projectId: p.id, name: 'Auth' });
    if ('error' in g) throw new Error('seed group failed');

    const preview = await parseBatch(p.id, [
      file('a.feature', '# trace-group: auth\nFeature: Login\n  Scenario: A\n    Given x\n'),
    ]);

    await commitBatch({
      previewId: preview.previewId,
      decisions: decisionsFor(preview.rows, 'import'),
    });

    const groups = await db.select().from(featureGroups).where(eq(featureGroups.projectId, p.id));
    expect(groups).toHaveLength(1);

    const feature = await db.query.features.findFirst({
      where: and(eq(features.projectId, p.id), eq(features.name, 'Login')),
    });
    expect(feature?.groupId).toBe(g.id);
  });

  it('overwrite path moves the feature to the group referenced in the imported meta', async () => {
    const p   = await mkProject({ name: `GmOvw ${Date.now()}` });
    const old = await createFeature({ projectId: p.id, name: 'Profile' });

    const preview = await parseBatch(p.id, [
      file('p.feature', '# trace-group: Settings\nFeature: Profile\n  Scenario: A\n    Given x\n'),
    ]);

    await commitBatch({
      previewId: preview.previewId,
      decisions: decisionsFor(preview.rows, 'overwrite'),
    });

    const updated  = await db.query.features.findFirst({ where: eq(features.id, old.id) });
    const settings = await db.query.featureGroups.findFirst({
      where: and(eq(featureGroups.projectId, p.id), eq(featureGroups.name, 'Settings')),
    });
    expect(settings).not.toBeUndefined();
    expect(updated?.groupId).toBe(settings?.id);
  });

  it('drops the preview buffer once committed', async () => {
    const p = await mkProject({ name: `Drp ${Date.now()}` });

    const preview = await parseBatch(p.id, [
      file('a.feature', 'Feature: Once\n  Scenario: A\n    Given x\n'),
    ]);

    await commitBatch({
      previewId: preview.previewId,
      decisions: decisionsFor(preview.rows, 'import'),
    });

    await expect(
      commitBatch({ previewId: preview.previewId, decisions: {} }),
    ).rejects.toThrow(/preview expired|not found/);
  });
});
