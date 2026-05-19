import { describe, it, expect } from 'vitest';
import { mkProject } from '../../fixtures';
import { createFeature } from '$lib/server/features/create';
import { archiveFeature } from '$lib/server/features/archive';
import { parseBatch } from '$lib/server/import/parse-batch';
import { getPreview } from '$lib/server/import/buffer';

function file(filename: string, content: string) {
  return { filename, bytes: Buffer.from(content) };
}

describe('parseBatch', () => {
  it('classifies new, collision (DB), and parse-error rows', async () => {
    const p = await mkProject({ name: `Pb ${Date.now()}` });
    await createFeature({ projectId: p.id, name: 'Login' });

    const preview = await parseBatch(p.id, [
      file('a.feature', 'Feature: Brand New\n  Scenario: A\n    Given x\n'),
      file('b.feature', 'Feature: Login\n  Scenario: A\n    Given x\n'),
      file('c.feature', 'garbage that does not parse\n'),
    ]);

    expect(preview.summary).toEqual({ new: 1, collisions: 1, parseErrors: 1, total: 3 });
    expect(preview.rows[0]?.status).toBe('new');
    expect(preview.rows[1]?.status).toBe('collision');
    expect(preview.rows[1]?.collidesWithId).toBeTruthy();
    expect(preview.rows[2]?.status).toBe('parse-error');
  });

  it('flags in-batch duplicate Feature: names as collision (spec §11.4)', async () => {
    const p = await mkProject({ name: `Inb ${Date.now()}` });

    const preview = await parseBatch(p.id, [
      file('a.feature', 'Feature: Twin\n  Scenario: A\n    Given x\n'),
      file('b.feature', 'Feature: Twin\n  Scenario: B\n    Given y\n'),
    ]);

    expect(preview.rows[0]?.status).toBe('new');
    expect(preview.rows[1]?.status).toBe('collision');
    expect(preview.rows[1]?.collidesWithId).toBeNull();
  });

  it('ignores archived features when checking for DB collisions', async () => {
    const p = await mkProject({ name: `Arc ${Date.now()}` });
    const old = await createFeature({ projectId: p.id, name: 'Recycled' });
    await archiveFeature(old.id);

    const preview = await parseBatch(p.id, [
      file('r.feature', 'Feature: Recycled\n  Scenario: A\n    Given x\n'),
    ]);

    expect(preview.rows[0]?.status).toBe('new');
    expect(preview.rows[0]?.collidesWithId).toBeNull();
  });

  it('captures the trace-group meta on each row', async () => {
    const p = await mkProject({ name: `Gm ${Date.now()}` });

    const preview = await parseBatch(p.id, [
      file('a.feature', '# trace-group: Auth\nFeature: Login\n  Scenario: A\n    Given x\n'),
      file('b.feature', 'Feature: Bare\n  Scenario: A\n    Given x\n'),
    ]);

    expect(preview.rows[0]?.groupName).toBe('Auth');
    expect(preview.rows[1]?.groupName).toBeNull();
  });

  it('stores raw buffers in the preview buffer for later commit', async () => {
    const p = await mkProject({ name: `Buf ${Date.now()}` });

    const preview = await parseBatch(p.id, [
      file('a.feature', 'Feature: Stored\n  Scenario: A\n    Given x\n'),
    ]);

    const entry = getPreview(preview.previewId);
    expect(entry).not.toBeNull();

    const rowId = preview.rows[0]?.rowId;
    expect(rowId).toBeTruthy();

    const raw = entry!.buffers.get(rowId!);
    expect(raw?.filename).toBe('a.feature');
    expect(raw?.bytes.toString('utf-8')).toContain('Feature: Stored');
  });
});
