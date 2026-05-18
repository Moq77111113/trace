import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import type { TestProject } from 'vitest/node';

const S3_BUCKET     = 'trace-attachments';
const S3_REGION     = 'us-east-1';
const S3_ACCESS_KEY = 'trace';
const S3_SECRET_KEY = 'tracetrace';

let pg:    StartedPostgreSqlContainer | null = null;
let minio: StartedTestContainer       | null = null;

export async function setup({ provide }: TestProject): Promise<void> {
  pg = await new PostgreSqlContainer('postgres:18-alpine')
    .withUsername('trace')
    .withPassword('trace')
    .withDatabase('trace')
    .start();

  const databaseUrl = pg.getConnectionUri();

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
  } finally {
    await sql.end();
  }

  provide('databaseUrl', databaseUrl);

  minio = await new GenericContainer('minio/minio:latest')
    .withCommand(['server', '/data'])
    .withEnvironment({
      MINIO_ROOT_USER:     S3_ACCESS_KEY,
      MINIO_ROOT_PASSWORD: S3_SECRET_KEY,
    })
    .withExposedPorts(9000)
    .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000))
    .start();

  const s3Endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;

  const s3 = new S3Client({
    endpoint:        s3Endpoint,
    region:          S3_REGION,
    credentials:     { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    forcePathStyle:  true,
  });
  await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));

  provide('s3Endpoint',  s3Endpoint);
  provide('s3Region',    S3_REGION);
  provide('s3Bucket',    S3_BUCKET);
  provide('s3AccessKey', S3_ACCESS_KEY);
  provide('s3SecretKey', S3_SECRET_KEY);
}

export async function teardown(): Promise<void> {
  await Promise.allSettled([pg?.stop(), minio?.stop()]);
  pg    = null;
  minio = null;
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    s3Endpoint:  string;
    s3Region:    string;
    s3Bucket:    string;
    s3AccessKey: string;
    s3SecretKey: string;
  }
}
