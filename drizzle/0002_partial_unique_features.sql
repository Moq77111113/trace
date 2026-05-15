DROP INDEX "features_project_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "features_project_name_unique"
  ON "features" ("project_id", LOWER("name")) WHERE "archived" = FALSE;
