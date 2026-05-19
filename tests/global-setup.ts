import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

// Mirror these in .env.test — $env/dynamic/private is frozen before this runs.
const PG_HOST_PORT     = 55433;
const MINIO_HOST_PORT  = 9100;
const PG_DATABASE      = 'trace';
const PG_USER          = 'trace';
const PG_PASSWORD      = 'trace';
const S3_BUCKET        = 'trace-attachments';
const S3_ACCESS_KEY    = 'trace';
const S3_SECRET_KEY    = 'tracetrace';

let pg:    StartedPostgreSqlContainer | null = null;
let minio: StartedTestContainer       | null = null;

export async function setup(): Promise<void> {
  pg = await new PostgreSqlContainer('postgres:18-alpine')
    .withUsername(PG_USER)
    .withPassword(PG_PASSWORD)
    .withDatabase(PG_DATABASE)
    .withExposedPorts({ container: 5432, host: PG_HOST_PORT })
    .start();

  const sql = postgres(pg.getConnectionUri(), { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
  } finally {
    await sql.end();
  }

  minio = await new GenericContainer('minio/minio:latest')
    .withCommand(['server', '/data'])
    .withEnvironment({
      MINIO_ROOT_USER:     S3_ACCESS_KEY,
      MINIO_ROOT_PASSWORD: S3_SECRET_KEY,
    })
    .withExposedPorts({ container: 9000, host: MINIO_HOST_PORT })
    .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000))
    .start();

  const s3 = new S3Client({
    endpoint:        `http://${minio.getHost()}:${MINIO_HOST_PORT}`,
    region:          'us-east-1',
    credentials:     { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    forcePathStyle:  true,
  });
  await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
}

export async function teardown(): Promise<void> {
  await Promise.allSettled([pg?.stop(), minio?.stop()]);
  pg    = null;
  minio = null;
}
