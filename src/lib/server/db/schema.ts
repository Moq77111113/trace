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

export const policySubjectKind = pgEnum('policy_subject_kind', ['user', 'any-user']);
export const policyScopeKind   = pgEnum('policy_scope_kind',   ['instance', 'project', 'feature', 'execution']);
export const policyEffect      = pgEnum('policy_effect',       ['allow', 'deny']);

export const campaignStatus  = pgEnum('campaign_status',  ['OPEN', 'CLOSED']);
export const campaignOutcome = pgEnum('campaign_outcome', ['PASSED', 'FAILED', 'INCONCLUSIVE']);

export type ParseError = { line: number; column?: number; message: string };

export const projects = pgTable(
  'projects',
  {
    id:          pk(),
    name:        text('name').notNull(),
    slug:        text('slug').notNull(),
    codePrefix:  text('code_prefix').notNull(),
    description: text('description'),
    createdBy:   uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
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
    uniqueIndex('manual_scenarios_feature_name_unique')
      .on(t.featureId, sql`LOWER(${t.name})`)
      .where(sql`${t.archived} = FALSE`),
    check('manual_scenarios_position_positive', sql`${t.position} >= 1`),
  ],
);

export const manualScenarioSteps = pgTable(
  'manual_scenario_steps',
  {
    id:         pk(),
    scenarioId: uuid('scenario_id').notNull().references(() => manualScenarios.id, { onDelete: 'cascade' }),
    position:   integer('position').notNull(),
    action:     text('action').notNull(),
    expected:   text('expected'),
    createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('manual_scenario_steps_scenario_position_unique').on(t.scenarioId, t.position),
    check('manual_scenario_steps_position_positive', sql`${t.position} >= 1`),
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

export const campaigns = pgTable(
  'campaigns',
  {
    id:         pk(),
    projectId:  uuid('project_id').notNull().references(() => projects.id, { onDelete: 'restrict' }),
    name:       text('name').notNull(),
    appVersion: text('app_version').notNull(),
    status:     campaignStatus('status').notNull().default('OPEN'),
    outcome:    campaignOutcome('outcome'),
    openedAt:   timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt:   timestamp('closed_at', { withTimezone: true }),
    closedBy:   text('closed_by'),
    createdBy:  text('created_by').notNull(),
  },
  (t) => [
    uniqueIndex('campaigns_project_name_idx').on(t.projectId, sql`LOWER(${t.name})`),
    uniqueIndex('campaigns_project_version_open_idx')
      .on(t.projectId, t.appVersion)
      .where(sql`${t.status} = 'OPEN'`),
  ],
);

export const campaignFeatures = pgTable(
  'campaign_features',
  {
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    featureId:  uuid('feature_id').notNull().references(() => features.id,  { onDelete: 'restrict' }),
    required:   boolean('required').notNull().default(true),
    position:   integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.campaignId, t.featureId] }),
    check('campaign_features_position_positive', sql`${t.position} >= 1`),
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
    campaignId:            uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  },
  (t) => [index('executions_feature_started_idx').on(t.featureId, sql`${t.startedAt} DESC`)],
);

export type ScenarioResultStep = {
  keyword:  string | null;
  text:     string;
  expected: string | null;
};

export const scenarioResults = pgTable(
  'scenario_results',
  {
    id:           pk(),
    executionId:  uuid('execution_id').notNull().references(() => executions.id, { onDelete: 'cascade' }),
    scenarioName: text('scenario_name').notNull(),
    source:       scenarioSource('source').notNull().default('GHERKIN'),
    position:     integer('position').notNull(),
    status:       scenarioStatus('status').notNull().default('PENDING'),
    durationMs:   integer('duration_ms'),
    logs:         text('logs'),
    errorMessage: text('error_message'),
    notes:        text('notes'),
    steps:        jsonb('steps').$type<ScenarioResultStep[]>().notNull().default(sql`'[]'::jsonb`),
    updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('scenario_results_execution_name_unique').on(t.executionId, t.scenarioName),
    uniqueIndex('scenario_results_execution_source_position_unique').on(t.executionId, t.source, t.position),
    check('scenario_results_position_positive', sql`${t.position} >= 1`),
  ],
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
  policiesBackfilledAt: timestamp('policies_backfilled_at', { withTimezone: true }),
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

export const policies = pgTable(
  'policies',
  {
    id:          pk(),
    subjectKind: policySubjectKind('subject_kind').notNull(),
    subjectId:   uuid('subject_id').references(() => user.id, { onDelete: 'cascade' }),
    action:      text('action').notNull(),
    scopeKind:   policyScopeKind('scope_kind').notNull(),
    scopeId:     uuid('scope_id'),
    effect:      policyEffect('effect').notNull(),
    condition:   jsonb('condition').$type<Record<string, unknown> | null>(),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('policies_subject_idx').on(t.subjectKind, t.subjectId),
    index('policies_scope_idx').on(t.scopeKind, t.scopeId),
  ],
);

export * from './auth.schema';
