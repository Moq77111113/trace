CREATE TABLE "manual_scenario_steps" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"action" text NOT NULL,
	"expected" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_scenario_steps_position_positive" CHECK ("manual_scenario_steps"."position" >= 1)
);
--> statement-breakpoint
ALTER TABLE "scenario_results" ADD COLUMN "steps" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "manual_scenario_steps" ADD CONSTRAINT "manual_scenario_steps_scenario_id_manual_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."manual_scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "manual_scenario_steps_scenario_position_unique" ON "manual_scenario_steps" USING btree ("scenario_id","position");