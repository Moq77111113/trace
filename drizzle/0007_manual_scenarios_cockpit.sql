CREATE UNIQUE INDEX "manual_scenarios_feature_name_unique" ON "manual_scenarios" USING btree ("feature_id", LOWER("name")) WHERE "manual_scenarios"."archived" = FALSE;--> statement-breakpoint
ALTER TABLE "scenario_results" ADD COLUMN "position" integer;--> statement-breakpoint
UPDATE "scenario_results" sr
SET "position" = ranked.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY execution_id, source
    ORDER BY scenario_name ASC
  ) AS rn
  FROM "scenario_results"
) ranked
WHERE sr.id = ranked.id;--> statement-breakpoint
ALTER TABLE "scenario_results" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scenario_results" ADD CONSTRAINT "scenario_results_position_positive" CHECK ("scenario_results"."position" >= 1);--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_results_execution_source_position_unique" ON "scenario_results" USING btree ("execution_id", "source", "position");
