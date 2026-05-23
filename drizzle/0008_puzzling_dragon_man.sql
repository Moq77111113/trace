CREATE TYPE "public"."policy_effect" AS ENUM('allow', 'deny');--> statement-breakpoint
CREATE TYPE "public"."policy_scope_kind" AS ENUM('instance', 'project', 'feature', 'execution');--> statement-breakpoint
CREATE TYPE "public"."policy_subject_kind" AS ENUM('user', 'any-user');--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"subject_kind" "policy_subject_kind" NOT NULL,
	"subject_id" uuid,
	"action" text NOT NULL,
	"scope_kind" "policy_scope_kind" NOT NULL,
	"scope_id" uuid,
	"effect" "policy_effect" NOT NULL,
	"condition" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "policies_backfilled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_subject_id_user_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "policies_subject_idx" ON "policies" USING btree ("subject_kind","subject_id");--> statement-breakpoint
CREATE INDEX "policies_scope_idx" ON "policies" USING btree ("scope_kind","scope_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;