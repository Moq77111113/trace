import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { requireEnv } from '$lib/server/config/env';

let cachedClient: S3Client | null = null;
let cachedBucket: string   | null = null;

function getClient(): S3Client {
	if (cachedClient) return cachedClient;
	cachedClient = new S3Client({
		endpoint: requireEnv('S3_ENDPOINT'),
		region: requireEnv('S3_REGION'),
		credentials: {
			accessKeyId: requireEnv('S3_ACCESS_KEY'),
			secretAccessKey: requireEnv('S3_SECRET_KEY')
		},
		forcePathStyle: true
	});
	return cachedClient;
}

function getBucket(): string {
	if (cachedBucket) return cachedBucket;
	cachedBucket = requireEnv('S3_BUCKET');
	return cachedBucket;
}

/**
 * Uploads a buffer to the configured bucket under the given key.
 */
export async function putObject(key: string, body: Buffer, mimeType: string): Promise<void> {
	await getClient().send(
		new PutObjectCommand({
			Bucket: getBucket(),
			Key: key,
			Body: body,
			ContentType: mimeType
		})
	);
}

/**
 * Fetches an object as a Node Readable stream.
 * The SDK's `Body` is a union (`Readable | ReadableStream | Blob | undefined`);
 * in Node it is always `Readable`, narrowed at runtime via `instanceof`.
 */
export async function getObjectStream(key: string): Promise<Readable> {
	const res = await getClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));

	if (!res.Body) throw new Error(`s3: empty body for key ${key}`);
	if (!(res.Body instanceof Readable)) {
		throw new Error(`s3: expected Node Readable stream for key ${key}`);
	}

	return res.Body;
}

/**
 * Removes an object from the configured bucket.
 */
export async function deleteObject(key: string): Promise<void> {
	await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}
