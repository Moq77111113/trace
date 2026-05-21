import { describe, it, expect } from 'vitest';
import { mkProject } from '../../fixtures';
import { createFeature } from '$lib/server/features/lifecycle/create';
import { streamProjectZip } from '$lib/server/projects/export-zip';

async function drain(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

describe('streamProjectZip', () => {
  it('streams a zip with one entry per non-archived feature', async () => {
    const p = await mkProject({ name: `Zip ${Date.now()}` });
    await createFeature({ projectId: p.id, name: 'Alpha' });
    await createFeature({ projectId: p.id, name: 'Beta One' });

    const out = await streamProjectZip(p.id);
    expect(out).not.toBeNull();

    const buf = await drain(out!.stream);
    expect(buf.slice(0, 4).toString('hex')).toBe('504b0304');
    expect(buf.includes(Buffer.from('alpha.feature'))).toBe(true);
    expect(buf.includes(Buffer.from('beta-one.feature'))).toBe(true);
  });

  it('suffixes duplicate slugs with a short id', async () => {
    const p = await mkProject({ name: `Dup ${Date.now()}` });
    await createFeature({ projectId: p.id, name: 'Same' });
    const second = await createFeature({ projectId: p.id, name: 'Same!' });

    const out = await streamProjectZip(p.id);
    const buf = await drain(out!.stream);

    expect(buf.includes(Buffer.from('same.feature'))).toBe(true);
    expect(buf.includes(Buffer.from(`same-${second.id.slice(0, 8)}.feature`))).toBe(true);
  });

  it('returns null for empty projects', async () => {
    const p = await mkProject({ name: `Empty ${Date.now()}` });
    expect(await streamProjectZip(p.id)).toBeNull();
  });

  it('returns null for missing projects', async () => {
    expect(await streamProjectZip('00000000-0000-7000-8000-000000000000')).toBeNull();
  });
});
