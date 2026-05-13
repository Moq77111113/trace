import {
  pgTable, uuid, text, boolean, timestamp,
  integer, jsonb, pgEnum, bigint, primaryKey,
} from 'drizzle-orm/pg-core';
import { pk } from './columns';

export const runSource      = pgEnum('run_source',      ['MANUAL', 'CI']);
export const runStatus      = pgEnum('run_status',      ['RUNNING', 'PASSED', 'FAILED', 'SKIPPED']);
export const scenarioStatus = pgEnum('scenario_status', ['PENDING', 'PASSED', 'FAILED', 'SKIPPED']);

export type ParseError = { line: number; column?: number; message: string };

export const projects = pgTable('projects', {
  id:          pk(),
  name:        text('name').notNull(),
  description: text('description'),
  archived:    boolean('archived').notNull().default(false),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const features = pgTable('features', {
  id:          pk(),
  projectId:   uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  content:     text('content').notNull(),
  parseErrors: jsonb('parse_errors').$type<ParseError[] | null>(),
  version:     integer('version').notNull().default(1),
  archived:    boolean('archived').notNull().default(false),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable('tags', {
  id:        pk(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const featureTags = pgTable(
  'feature_tags',
  {
    featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
    tagId:     uuid('tag_id').notNull().references(() => tags.id,     { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.featureId, t.tagId] })],
);

export const runs = pgTable('runs', {
  id:                  pk(),
  featureId:           uuid('feature_id').notNull().references(() => features.id, { onDelete: 'restrict' }),
  source:              runSource('source').notNull(),
  executedBy:          text('executed_by').notNull(),
  environment:         text('environment'),
  notes:               text('notes'),
  featureContentAtRun: text('feature_content_at_run').notNull(),
  status:              runStatus('status').notNull().default('RUNNING'),
  startedAt:           timestamp('started_at',  { withTimezone: true }).notNull().defaultNow(),
  finishedAt:          timestamp('finished_at', { withTimezone: true }),
});

export const scenarioResults = pgTable('scenario_results', {
  id:           pk(),
  runId:        uuid('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  scenarioName: text('scenario_name').notNull(),
  status:       scenarioStatus('status').notNull().default('PENDING'),
  durationMs:   integer('duration_ms'),
  logs:         text('logs'),
  errorMessage: text('error_message'),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attachments = pgTable('attachments', {
  id:               pk(),
  runId:            uuid('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  scenarioResultId: uuid('scenario_result_id').references(() => scenarioResults.id, { onDelete: 'cascade' }),
  filename:         text('filename').notNull(),
  mimeType:         text('mime_type').notNull(),
  sizeBytes:        bigint('size_bytes', { mode: 'number' }).notNull(),
  storageKey:       text('storage_key').notNull(),
  uploadedBy:       text('uploaded_by').notNull(),
  uploadedAt:       timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

// Auth tables are re-exported here so drizzle-kit picks them up when M6 activates
// Better Auth. The file is currently empty until `pnpm auth:schema` runs in M6.1.
export * from './auth.schema';
