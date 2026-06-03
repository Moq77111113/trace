CREATE TABLE "scenario_result_steps" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"scenario_result_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"keyword" text,
	"text" text NOT NULL,
	"expected" text,
	"verdict" "scenario_status" DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scenario_result_steps_position_positive" CHECK ("scenario_result_steps"."position" >= 1)
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "scenario_result_step_id" uuid;--> statement-breakpoint
ALTER TABLE "scenario_result_steps" ADD CONSTRAINT "scenario_result_steps_scenario_result_id_scenario_results_id_fk" FOREIGN KEY ("scenario_result_id") REFERENCES "public"."scenario_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_result_steps_result_position_unique" ON "scenario_result_steps" USING btree ("scenario_result_id","position");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_scenario_result_step_id_scenario_result_steps_id_fk" FOREIGN KEY ("scenario_result_step_id") REFERENCES "public"."scenario_result_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_results" DROP COLUMN "steps";