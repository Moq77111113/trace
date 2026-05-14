import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { Readable } from 'node:stream';

/**
 * Reads an environment variable or throws if unset.
 * Centralises the "fail fast on missing config" rule for the storage adapter.
 */
function requireEnv(key: string): string {
	const value = env[key];
	if (!value) throw new Error(`s3 adapter: ${key} is not set`);
	return value;
}

const bucket = requireEnv('S3_BUCKET');

const client = new S3Client({
	endpoint: requireEnv('S3_ENDPOINT'),
	region: requireEnv('S3_REGION'),
	credentials: {
		accessKeyId: requireEnv('S3_ACCESS_KEY'),
		secretAccessKey: requireEnv('S3_SECRET_KEY')
	},
	forcePathStyle: true
});

/**
 * Uploads a buffer to the configured bucket under the given key.
 */
export async function putObject(key: string, body: Buffer, mimeType: string): Promise<void> {
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
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
	const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

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
	await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
