// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db/client';
import { attachments, executions, features, projects, scenarioResults } from '$lib/server/db/schema';
import { putObject, deleteObject } from '$lib/server/storage/s3';
import { GET } from '../../../src/routes/(public)/api/attachments/[aid]/+server';

type AttachmentEvent = Parameters<typeof GET>[0];

function buildEvent(aid: string) {
  return { params: { aid } } as unknown as AttachmentEvent;
}

async function invoke(event: AttachmentEvent) {
  try {
    const res = await GET(event);
    return { status: res.status, headers: res.headers, body: await res.text() };
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) {
      const err = e as { status: number; body: { message: string } };
      return { status: err.status, headers: new Headers(), body: err.body.message };
    }
    throw e;
  }
}

async function seedRunWithScenario() {
  const [p] = await db.insert(projects).values({ name: `Att ${Date.now()}-${Math.random()}` }).returning();
  if (!p) throw new Error('seed: project insert failed');

  const [f] = await db
    .insert(features)
    .values({ projectId: p.id, name: 'Att', content: 'Feature: Att\n\n  Scenario: A\n    Given x\n' })
    .returning();
  if (!f) throw new Error('seed: feature insert failed');

  const [r] = await db
    .insert(executions)
    .values({
      featureId:           f.id,
      source:              'MANUAL',
      executedBy:          'Alice',
      featureContentAtStart: f.content,
    })
    .returning();
  if (!r) throw new Error('seed: run insert failed');

  const [s] = await db.insert(scenarioResults).values({ executionId: r.id, scenarioName: 'A' }).returning();
  if (!s) throw new Error('seed: scenario insert failed');

  return { run: r, scenario: s };
}

describe('GET /api/attachments/[aid]', () => {
  it('streams the stored object with correct headers', async () => {
    const { run, scenario } = await seedRunWithScenario();
    const storageKey = `tests/${randomUUID()}.txt`;
    const body       = Buffer.from('hello attachment');

    await putObject(storageKey, body, 'text/plain');

    const [att] = await db
      .insert(attachments)
      .values({
        executionId:            run.id,
        scenarioResultId: scenario.id,
        filename:         'note.txt',
        mimeType:         'text/plain',
        sizeBytes:        body.length,
        storageKey,
        uploadedBy:       'Alice',
      })
      .returning();
    if (!att) throw new Error('seed: attachment insert failed');

    try {
      const res = await invoke(buildEvent(att.id));

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/plain');
      expect(res.headers.get('content-length')).toBe(String(body.length));
      expect(res.headers.get('content-disposition')).toContain('inline');
      expect(res.headers.get('content-disposition')).toContain('note.txt');
      expect(res.body).toBe('hello attachment');
    } finally {
      await deleteObject(storageKey);
    }
  });

  it('returns 404 for unknown id', async () => {
    const res = await invoke(buildEvent(randomUUID()));
    expect(res.status).toBe(404);
  });

  it('strips double quotes from filename in Content-Disposition', async () => {
    const { run, scenario } = await seedRunWithScenario();
    const storageKey = `tests/${randomUUID()}.txt`;

    await putObject(storageKey, Buffer.from('x'), 'text/plain');

    const [att] = await db
      .insert(attachments)
      .values({
        executionId:            run.id,
        scenarioResultId: scenario.id,
        filename:         'evil"name.txt',
        mimeType:         'text/plain',
        sizeBytes:        1,
        storageKey,
        uploadedBy:       'Alice',
      })
      .returning();
    if (!att) throw new Error('seed: attachment insert failed');

    try {
      const res = await invoke(buildEvent(att.id));
      const disp = res.headers.get('content-disposition') ?? '';
      expect(disp).toContain('evilname.txt');
      expect(disp).not.toContain('evil"name');
    } finally {
      await deleteObject(storageKey);
    }
  });
});
