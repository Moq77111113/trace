import '@testing-library/jest-dom/vitest';
import { inject } from 'vitest';

process.env.DATABASE_URL  = inject('databaseUrl');
process.env.S3_ENDPOINT   = inject('s3Endpoint');
process.env.S3_REGION     = inject('s3Region');
process.env.S3_BUCKET     = inject('s3Bucket');
process.env.S3_ACCESS_KEY = inject('s3AccessKey');
process.env.S3_SECRET_KEY = inject('s3SecretKey');
