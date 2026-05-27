CREATE TYPE "public"."campaign_outcome" AS ENUM('PASSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('OPEN', 'CLOSED');--> statement-breakpoint
CREATE TABLE "campaign_features" (
	"campaign_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "campaign_features_campaign_id_feature_id_pk" PRIMARY KEY("campaign_id","feature_id"),
	CONSTRAINT "campaign_features_position_positive" CHECK ("campaign_features"."position" >= 1)
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"app_version" text NOT NULL,
	"status" "campaign_status" DEFAULT 'OPEN' NOT NULL,
	"outcome" "campaign_outcome",
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"created_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "campaign_features" ADD CONSTRAINT "campaign_features_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_features" ADD CONSTRAINT "campaign_features_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_project_name_idx" ON "campaigns" USING btree ("project_id",LOWER("name"));--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;