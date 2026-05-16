import {
  pgTable, uuid, text, boolean, timestamp,
  integer, jsonb, pgEnum, bigint, primaryKey, uniqueIndex, index,
  smallint, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk } from './columns';
import { user } from './auth.schema';

export const runSource      = pgEnum('run_source',      ['MANUAL', 'CI']);
export const runStatus      = pgEnum('run_status',      ['RUNNING', 'PASSED', 'FAILED', 'SKIPPED']);
export const scenarioStatus = pgEnum('scenario_status', ['PENDING', 'PASSED', 'FAILED', 'SKIPPED']);

export type ParseError = { line: number; column?: number; message: string };

export const projects = pgTable(
  'projects',
  {
    id:          pk(),
    name:        text('name').notNull(),
    description: text('description'),
    archived:    boolean('archived').notNull().default(false),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('projects_name_unique')
      .on(sql`LOWER(${t.name})`)
      .where(sql`${t.archived} = FALSE`),
  ],
);

export const featureGroups = pgTable(
  'feature_groups',
  {
    id:        pk(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name:      text('name').notNull(),
    position:  integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('feature_groups_project_name_idx').on(t.projectId, t.name)],
);

export const features = pgTable(
  'features',
  {
    id:          pk(),
    projectId:   uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    groupId:     uuid('group_id').references(() => featureGroups.id, { onDelete: 'set null' }),
    name:        text('name').notNull(),
    content:     text('content').notNull(),
    parseErrors: jsonb('parse_errors').$type<ParseError[] | null>(),
    version:     integer('version').notNull().default(1),
    archived:    boolean('archived').notNull().default(false),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('features_project_name_unique')
      .on(t.projectId, sql`LOWER(${t.name})`)
      .where(sql`${t.archived} = FALSE`),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id:        pk(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name:      text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('tags_project_name_unique').on(t.projectId, sql`LOWER(${t.name})`)],
);

export const featureTags = pgTable(
  'feature_tags',
  {
    featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
    tagId:     uuid('tag_id').notNull().references(() => tags.id,     { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.featureId, t.tagId] }),
    index('feature_tags_tag_idx').on(t.tagId),
  ],
);

export const runs = pgTable(
  'runs',
  {
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
  },
  (t) => [index('runs_feature_started_idx').on(t.featureId, sql`${t.startedAt} DESC`)],
);

export const scenarioResults = pgTable(
  'scenario_results',
  {
    id:           pk(),
    runId:        uuid('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
    scenarioName: text('scenario_name').notNull(),
    status:       scenarioStatus('status').notNull().default('PENDING'),
    durationMs:   integer('duration_ms'),
    logs:         text('logs'),
    errorMessage: text('error_message'),
    updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('scenario_results_run_name_unique').on(t.runId, t.scenarioName)],
);

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

export const instanceSettings = pgTable('instance_settings', {
  id:                 smallint('id').primaryKey().default(1),
  signupBudget:       integer('signup_budget').notNull().default(0),
  signupWindowEndsAt: timestamp('signup_window_ends_at', { withTimezone: true }),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy:          uuid('updated_by').references(() => user.id, { onDelete: 'set null' }),
}, (t) => [
  check('instance_settings_singleton',     sql`${t.id} = 1`),
  check('instance_settings_budget_nonneg', sql`${t.signupBudget} >= 0`),
]);

// Auth tables are re-exported here so drizzle-kit picks them up when M6 activates
// Better Auth. The file is currently empty until `pnpm auth:schema` runs in M6.1.
export * from './auth.schema';
