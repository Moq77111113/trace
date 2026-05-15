CREATE TABLE "feature_groups" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "feature_groups" ADD CONSTRAINT "feature_groups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feature_groups_project_name_idx" ON "feature_groups" USING btree ("project_id","name");--> statement-breakpoint
ALTER TABLE "features" ADD CONSTRAINT "features_group_id_feature_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."feature_groups"("id") ON DELETE set null ON UPDATE no action;