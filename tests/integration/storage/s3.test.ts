// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { putObject, getObjectStream, deleteObject } from '$lib/server/storage/s3';

describe('s3 adapter', () => {
	it('round-trips a small payload', async () => {
		const key = `tests/${randomUUID()}.txt`;
		await putObject(key, Buffer.from('hello trace'), 'text/plain');

		const stream = await getObjectStream(key);
		const chunks: Buffer[] = [];
		for await (const chunk of stream) chunks.push(Buffer.from(chunk));
		expect(Buffer.concat(chunks).toString()).toBe('hello trace');

		await deleteObject(key);
	});
});
