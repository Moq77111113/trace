CREATE TYPE "public"."run_source" AS ENUM('MANUAL', 'CI');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('RUNNING', 'PASSED', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."scenario_status" AS ENUM('PENDING', 'PASSED', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"run_id" uuid NOT NULL,
	"scenario_result_id" uuid,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_tags" (
	"feature_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "feature_tags_feature_id_tag_id_pk" PRIMARY KEY("feature_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "features" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"parse_errors" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"feature_id" uuid NOT NULL,
	"source" "run_source" NOT NULL,
	"executed_by" text NOT NULL,
	"environment" text,
	"notes" text,
	"feature_content_at_run" text NOT NULL,
	"status" "run_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scenario_results" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"run_id" uuid NOT NULL,
	"scenario_name" text NOT NULL,
	"status" "scenario_status" DEFAULT 'PENDING' NOT NULL,
	"duration_ms" integer,
	"logs" text,
	"error_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_scenario_result_id_scenario_results_id_fk" FOREIGN KEY ("scenario_result_id") REFERENCES "public"."scenario_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_tags" ADD CONSTRAINT "feature_tags_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_tags" ADD CONSTRAINT "feature_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "features" ADD CONSTRAINT "features_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_results" ADD CONSTRAINT "scenario_results_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX projects_name_unique
  ON projects (LOWER(name)) WHERE archived = FALSE;
--> statement-breakpoint
CREATE UNIQUE INDEX features_project_name_unique
  ON features (project_id, LOWER(name));
--> statement-breakpoint
CREATE UNIQUE INDEX tags_project_name_unique
  ON tags (project_id, LOWER(name));
--> statement-breakpoint
CREATE INDEX feature_tags_tag_idx ON feature_tags (tag_id);
--> statement-breakpoint
CREATE INDEX runs_feature_started_idx ON runs (feature_id, started_at DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX scenario_results_run_name_unique
  ON scenario_results (run_id, scenario_name);
