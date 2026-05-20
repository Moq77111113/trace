CREATE TYPE "public"."scenario_source" AS ENUM('GHERKIN', 'MANUAL');--> statement-breakpoint
CREATE TABLE "manual_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"feature_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_scenarios_position_positive" CHECK ("manual_scenarios"."position" >= 1)
);
--> statement-breakpoint
ALTER TABLE "features" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "scenario_results" ADD COLUMN "source" "scenario_source" DEFAULT 'GHERKIN' NOT NULL;--> statement-breakpoint
ALTER TABLE "manual_scenarios" ADD CONSTRAINT "manual_scenarios_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "manual_scenarios_feature_position_unique" ON "manual_scenarios" USING btree ("feature_id","position") WHERE "manual_scenarios"."archived" = FALSE;