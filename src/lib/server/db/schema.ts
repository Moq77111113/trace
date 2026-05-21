import {
  pgTable, uuid, text, boolean, timestamp,
  integer, jsonb, pgEnum, bigint, primaryKey, uniqueIndex, index,
  smallint, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk } from './columns';
import { user } from './auth.schema';
import { SMTP_DEFAULT_PORT } from '$lib/server/email/constants';
import type { CiMetadata } from '$lib/entities/execution/lib/ci-metadata';

export const executionSource = pgEnum('execution_source', ['MANUAL', 'CI']);
export const executionStatus = pgEnum('execution_status', ['IN_PROGRESS', 'PASSED', 'FAILED', 'SKIPPED', 'ABORTED']);
export const scenarioStatus  = pgEnum('scenario_status',  ['PENDING', 'PASSED', 'FAILED', 'SKIPPED']);
export const scenarioSource  = pgEnum('scenario_source',  ['GHERKIN', 'MANUAL']);

export type ParseError = { line: number; column?: number; message: string };

export const projects = pgTable(
  'projects',
  {
    id:          pk(),
    name:        text('name').notNull(),
    slug:        text('slug').notNull(),
    codePrefix:  text('code_prefix').notNull(),
    description: text('description'),
    archived:    boolean('archived').notNull().default(false),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('projects_name_unique')
      .on(sql`LOWER(${t.name})`)
      .where(sql`${t.archived} = FALSE`),
    uniqueIndex('projects_slug_unique').on(t.slug),
    check(
      'projects_slug_kebab',
      sql`${t.slug} ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length(${t.slug}) BETWEEN 2 AND 40`,
    ),
    check(
      'projects_code_prefix_kebab',
      sql`${t.codePrefix} ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length(${t.codePrefix}) BETWEEN 2 AND 15`,
    ),
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
    codeSeq:     integer('code_seq').notNull(),
    name:        text('name').notNull(),
    description: text('description'),
    content:     text('content').notNull().default(''),
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
    uniqueIndex('features_project_code_seq_unique').on(t.projectId, t.codeSeq),
    check('features_code_seq_positive', sql`${t.codeSeq} >= 1`),
  ],
);

export const manualScenarios = pgTable(
  'manual_scenarios',
  {
    id:        pk(),
    featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
    position:  integer('position').notNull(),
    name:      text('name').notNull(),
    archived:  boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('manual_scenarios_feature_position_unique')
      .on(t.featureId, t.position)
      .where(sql`${t.archived} = FALSE`),
    check('manual_scenarios_position_positive', sql`${t.position} >= 1`),
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

export const executions = pgTable(
  'executions',
  {
    id:                    pk(),
    featureId:             uuid('feature_id').notNull().references(() => features.id, { onDelete: 'restrict' }),
    source:                executionSource('source').notNull(),
    executedBy:            text('executed_by').notNull(),
    environment:           text('environment'),
    featureContentAtStart: text('feature_content_at_start').notNull(),
    status:                executionStatus('status').notNull().default('IN_PROGRESS'),
    startedAt:             timestamp('started_at',  { withTimezone: true }).notNull().defaultNow(),
    finishedAt:            timestamp('finished_at', { withTimezone: true }),
    ciMetadata:            jsonb('ci_metadata').$type<CiMetadata>(),
  },
  (t) => [index('executions_feature_started_idx').on(t.featureId, sql`${t.startedAt} DESC`)],
);

export const scenarioResults = pgTable(
  'scenario_results',
  {
    id:           pk(),
    executionId:  uuid('execution_id').notNull().references(() => executions.id, { onDelete: 'cascade' }),
    scenarioName: text('scenario_name').notNull(),
    source:       scenarioSource('source').notNull().default('GHERKIN'),
    status:       scenarioStatus('status').notNull().default('PENDING'),
    durationMs:   integer('duration_ms'),
    logs:         text('logs'),
    errorMessage: text('error_message'),
    notes:        text('notes'),
    updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('scenario_results_execution_name_unique').on(t.executionId, t.scenarioName)],
);

export const attachments = pgTable('attachments', {
  id:               pk(),
  executionId:      uuid('execution_id').notNull().references(() => executions.id, { onDelete: 'cascade' }),
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
  smtpHost:           text('smtp_host').notNull().default(''),
  smtpPort:           integer('smtp_port').notNull().default(SMTP_DEFAULT_PORT),
  smtpUser:           text('smtp_user').notNull().default(''),
  smtpPasswordEnc:    text('smtp_password_enc').notNull().default(''),
  smtpFrom:           text('smtp_from').notNull().default(''),
  smtpSecure:         boolean('smtp_secure').notNull().default(false),
  smtpTestedAt:       timestamp('smtp_tested_at', { withTimezone: true }),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy:          uuid('updated_by').references(() => user.id, { onDelete: 'set null' }),
}, (t) => [
  check('instance_settings_singleton',     sql`${t.id} = 1`),
  check('instance_settings_budget_nonneg', sql`${t.signupBudget} >= 0`),
  check('instance_settings_smtp_port',     sql`${t.smtpPort} BETWEEN 1 AND 65535`),
]);

export const adminResetLinks = pgTable('admin_reset_links', {
  id:              pk(),
  targetUserId:    uuid('target_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  mintedByUserId:  uuid('minted_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  mintedAt:        timestamp('minted_at',  { withTimezone: true }).notNull().defaultNow(),
  usedAt:          timestamp('used_at',    { withTimezone: true }),
}, (t) => [
  index('admin_reset_links_target_idx').on(t.targetUserId),
  index('admin_reset_links_minted_at_desc').on(sql`${t.mintedAt} DESC`),
]);

export * from './auth.schema';
